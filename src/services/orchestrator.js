/* ============================================================================
   AGENT ORCHESTRATOR — ReAct Loop (Reason → Act → Observe)

   FIXES vs. original:
   ① Per-call execution context (ctx) — no shared this.state race condition
   ② Separate regenerationAttempts counter — quiz retry loop now actually fires
   ③ observe() handles ALL action types, including the full cheat-sheet chain
   ④ decideNextAction is named accurately (it's deterministic routing, not LLM reasoning)
   ⑤ retrieveFocusedContext uses cached knowledge map instead of re-loading all files
   ============================================================================ */

import { agentMemory, AgentMemory }        from './memory.js';
import { tools }                            from './tools.js';
import { runAnalyzer }                      from './agents/analyzerAgent.js';
import { runGenerator, runGrader }          from './agents/quizAgent.js';
import { runCheatSheetGenerator, identifyWeakAreas } from './agents/studyGuideAgent.js';
import { runQA }                            from './agents/chatAgent.js';

const MAX_LOOPS = 10;          // hard ceiling on total state transitions per task
const MAX_REGEN = 2;           // max quiz regeneration attempts when validation fails
const log = (...a) => import.meta.env.DEV && console.log('🤖 [ORCH]', ...a);

export class AgentOrchestrator {
    constructor(genAI) {
        this.genAI = genAI;
    }

    // ── Main entry point ─────────────────────────────────────────────────────

    async executeTask(taskType, params) {
        log(`START "${taskType}"`);

        // ① Each call gets its own isolated context — no shared mutable state
        const ctx = {
            step:                'initialize',
            loopCount:           0,
            regenerationAttempts: 0,   // ② separate from loopCount
            errors:              [],
            results:             {},
        };

        agentMemory.clearWorking();
        agentMemory.updateWorking({ taskType, startTime: Date.now() });

        while (ctx.step !== 'complete' && ctx.loopCount < MAX_LOOPS) {
            try {
                log(`  step="${ctx.step}" loop=${ctx.loopCount}`);

                // REASON — decide what to do next
                const action = this.decideNextAction(taskType, params, ctx);
                log(`  action="${action.type}"`);

                // ACT — execute the action
                const result = await this.act(action, params, ctx);

                // OBSERVE — update ctx based on result
                this.transition(result, action, ctx);

            } catch (err) {
                console.error('[ORCH] error in step', ctx.step, err.message);
                ctx.errors.push({ step: ctx.step, error: err.message });
                // Abort after 3 errors to avoid runaway loops
                if (ctx.errors.length >= 3) {
                    log('  ⚠️ too many errors — aborting');
                    ctx.step = 'complete';
                }
            }
            ctx.loopCount++;
        }

        log(`DONE "${taskType}" in ${ctx.loopCount} loops`);
        return ctx.results;
    }

    // ── REASON — deterministic next-action routing ───────────────────────────
    //    (renamed from reason() to make it clear this is NOT an LLM call)

    decideNextAction(taskType, params, ctx) {
        switch (taskType) {
            case 'generateQuiz':     return this._decideQuiz(params, ctx);
            case 'gradeQuiz':        return this._decideGrading(params, ctx);
            case 'answerQuestion':   return this._decideQA(params, ctx);
            case 'generateCheatSheet': return this._decideCheatSheet(params, ctx);
            default: throw new Error(`Unknown task type: ${taskType}`);
        }
    }

    _decideQuiz(params, ctx) {
        switch (ctx.step) {
            case 'initialize':
                return { type: 'loadFiles', data: { lectureId: params.lectureId } };

            case 'filesLoaded': {
                const cached = tools.retrieveFromMemory(`knowledge_${params.lectureId}`);
                if (cached) {
                    log('  using cached knowledge map');
                    return { type: 'useCachedKnowledge', data: cached };
                }
                return { type: 'analyzeContent', data: { files: ctx.results.files } };
            }

            case 'contentAnalyzed':
                return { type: 'generateQuestions', data: {} };

            case 'questionsGenerated':
                return { type: 'validateQuiz', data: {} };

            case 'quizValidated':
                // ② Use regenerationAttempts — not the outer loopCount
                if (!ctx.results.validation.passed && ctx.regenerationAttempts < MAX_REGEN) {
                    return {
                        type: 'regenerateQuestions',
                        data: { feedback: ctx.results.validation.issues },
                    };
                }
                if (!ctx.results.validation.passed) {
                    log('  ⚠️ accepting quiz despite validation issues (max regen reached)');
                }
                return { type: 'finalize', data: { quiz: ctx.results.quiz } };

            case 'quizRegenerated':
                return { type: 'validateQuiz', data: {} };

            default:
                return { type: 'finalize', data: ctx.results };
        }
    }

    _decideGrading(params, ctx) {
        switch (ctx.step) {
            case 'initialize':
                return { type: 'loadContext', data: { lectureId: params.lectureId } };
            case 'contextLoaded':
                return { type: 'gradeResponses', data: {} };
            case 'responsesGraded':
                return { type: 'finalize', data: { grades: ctx.results.grades } };
            default:
                return { type: 'finalize', data: ctx.results };
        }
    }

    _decideQA(params, ctx) {
        switch (ctx.step) {
            case 'initialize':
                return params.lectureId
                    ? { type: 'loadFiles',       data: { lectureId: params.lectureId } }
                    : { type: 'directAnswer',    data: { prompt: params.prompt } };
            case 'filesLoaded':
                return { type: 'answerWithContext', data: { prompt: params.prompt } };
            default:
                return { type: 'finalize', data: ctx.results };
        }
    }

    _decideCheatSheet(params, ctx) {
        switch (ctx.step) {
            case 'initialize':
                return { type: 'analyzeWeakness', data: {} };
            case 'weaknessAnalyzed':
                return { type: 'retrieveFocusedContext', data: { lectureId: params.lectureId } };
            case 'contextRetrieved':
                return { type: 'synthesizeCheatSheet', data: {} };
            case 'sheetSynthesized':
                return { type: 'finalize', data: { markdown: ctx.results.cheatSheet } };
            default:
                return { type: 'finalize', data: ctx.results };
        }
    }

    // ── ACT — execute the determined action ──────────────────────────────────

    async act(action, params, ctx) {
        switch (action.type) {

            case 'loadFiles': {
                const files = await tools.loadLectureFiles(action.data.lectureId);
                agentMemory.updateWorking({ filesLoaded: true });
                return { files };
            }

            case 'useCachedKnowledge':
                return { knowledgeMap: action.data.knowledgeMap };

            case 'analyzeContent': {
                const knowledgeMap = await runAnalyzer(this.genAI, ctx.results.files);
                tools.storeResult(`knowledge_${params.lectureId}`, { knowledgeMap });
                return { knowledgeMap };
            }

            case 'generateQuestions': {
                const quiz = await runGenerator(
                    this.genAI,
                    ctx.results.files,
                    ctx.results.knowledgeMap,
                    params.lectureId,
                );
                return { quiz };
            }

            case 'regenerateQuestions': {
                ctx.regenerationAttempts++;    // ② tracked separately
                const quiz = await runGenerator(
                    this.genAI,
                    ctx.results.files,
                    ctx.results.knowledgeMap,
                    params.lectureId,
                    action.data.feedback,
                );
                return { quiz };
            }

            case 'validateQuiz': {
                const validation = tools.validateQuizQuality(ctx.results.quiz);
                return { validation };
            }

            case 'loadContext': {
                const contextFiles = params.lectureId
                    ? await tools.loadLectureFiles(params.lectureId)
                    : [];
                return { contextFiles };
            }

            case 'gradeResponses': {
                const grades = await runGrader(
                    this.genAI,
                    params.quiz,
                    params.answers,
                    ctx.results.contextFiles,
                );
                return { grades };
            }

            case 'answerWithContext': {
                const answer = await runQA(this.genAI, action.data.prompt, ctx.results.files, params.lectureId);
                return { answer };
            }

            case 'directAnswer': {
                const answer = await runQA(this.genAI, action.data.prompt);
                return { answer };
            }

            case 'analyzeWeakness': {
                // ③ Uses questionGrades from AI grading — covers MCQ + short + essay
                const weakAreas = identifyWeakAreas(params.questionGrades);
                return { weakAreas };
            }

            case 'retrieveFocusedContext': {
                // ⑤ Use cached knowledge map + targeted files instead of re-loading everything
                const cached = tools.retrieveFromMemory(`knowledge_${action.data.lectureId}`);
                if (cached?.knowledgeMap) {
                    // Filter only the concepts that overlap with the weak areas
                    const weakTopics = (ctx.results.weakAreas || []).map(w => w.topic.toLowerCase());
                    const relevantConcepts = (cached.knowledgeMap.concepts || [])
                        .filter(c => weakTopics.some(t => c.name.toLowerCase().includes(t.substring(0, 20))))
                        .slice(0, 10); // cap to avoid token bloat

                    const focusedContext = [{
                        text: `FOCUSED CONTEXT (from cached knowledge map):\n${JSON.stringify(relevantConcepts, null, 2)}`,
                    }];
                    return { focusedContext };
                }
                // Fallback: load files if no cache exists
                const focusedContext = await tools.loadLectureFiles(action.data.lectureId);
                return { focusedContext };
            }

            case 'synthesizeCheatSheet': {
                const cheatSheet = await runCheatSheetGenerator(
                    this.genAI,
                    ctx.results.weakAreas,
                    ctx.results.focusedContext,
                );
                return { cheatSheet };
            }

            case 'finalize':
                return action.data;

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    // ── OBSERVE — transition ctx.step based on completed action ─────────────
    //    ③ All action types are handled — no missing cheat-sheet transitions

    transition(result, action, ctx) {
        // Merge results
        ctx.results = { ...ctx.results, ...result };
        agentMemory.updateWorking({ step: ctx.step, lastAction: action.type });

        // State transitions
        const map = {
            loadFiles:             'filesLoaded',
            useCachedKnowledge:    'contentAnalyzed',
            analyzeContent:        'contentAnalyzed',
            generateQuestions:     'questionsGenerated',
            regenerateQuestions:   'quizRegenerated',
            validateQuiz:          'quizValidated',
            loadContext:           'contextLoaded',
            gradeResponses:        'responsesGraded',
            answerWithContext:     'answerGenerated',
            directAnswer:          'answerGenerated',
            // ③ Cheat-sheet chain — previously missing, caused infinite loop
            analyzeWeakness:       'weaknessAnalyzed',
            retrieveFocusedContext:'contextRetrieved',
            synthesizeCheatSheet:  'sheetSynthesized',
            finalize:              'complete',
        };

        ctx.step = map[action.type] ?? ctx.step;
        log(`  → "${ctx.step}"`);
    }
}
