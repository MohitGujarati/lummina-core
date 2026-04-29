import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-quiz-data',
      configureServer(server) {
        server.middlewares.use('/api/save-quiz', async (req, res, next) => {
          if (req.method === 'POST') {
            const fs = await import('node:fs');
            const path = await import('node:path');

            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });

            req.on('end', () => {
              try {
                const filePath = path.resolve(__dirname, 'src/data/userQuizAnswer.toon');
                fs.writeFileSync(filePath, body);
                res.statusCode = 200;
                res.end('File saved successfully');
              } catch (err) {
                console.error('Error saving file:', err);
                res.statusCode = 500;
                res.end('Error saving file');
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
