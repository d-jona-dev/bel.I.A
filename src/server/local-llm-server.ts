// src/server/local-llm-server.ts
import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 9000;
const LLAMA_SERVER_PORT = 8080;
const MODELS_DIR = path.join(process.cwd(), 'models');
const LLAMA_CPP_PATH = path.join(process.cwd(), 'llama.cpp/server'); // Path to the llama.cpp server executable

let llamaServerProcess: ChildProcess | null = null;
let currentModel: string | null = null;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:9002' })); // Allow requests from the Next.js app

// Function to find .gguf files in the models directory
const getAvailableModels = (): string[] => {
    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
        return [];
    }
    return fs.readdirSync(MODELS_DIR).filter(file => file.endsWith('.gguf'));
};

// Function to stop the current llama.cpp server process
const stopLlamaServer = () => {
    if (llamaServerProcess) {
        console.log('Stopping existing llama.cpp server...');
        llamaServerProcess.kill();
        llamaServerProcess = null;
        currentModel = null;
        console.log('Server stopped.');
    }
};

// Function to start the llama.cpp server with a specific model
const startLlamaServer = (modelName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (llamaServerProcess) {
            if (currentModel === modelName) {
                console.log(`llama.cpp server is already running with model ${modelName}.`);
                return resolve();
            }
            stopLlamaServer();
        }

        const modelPath = path.join(MODELS_DIR, modelName);
        if (!fs.existsSync(modelPath)) {
            return reject(new Error(`Model file not found: ${modelPath}`));
        }

        if (!fs.existsSync(LLAMA_CPP_PATH)) {
            const message = `llama.cpp server executable not found at ${LLAMA_CPP_PATH}. Please build or place it there.`;
            console.error(message);
            return reject(new Error(message));
        }

        console.log(`Starting llama.cpp server with model: ${modelName}`);
        const args = [
            '--model', modelPath,
            '--port', String(LLAMA_SERVER_PORT),
            '--n-predict', '1024', // Increased prediction length for story generation
            '--threads', '6',
            '--ctx-size', '2048', // Context size
        ];

        llamaServerProcess = spawn(LLAMA_CPP_PATH, args, { stdio: 'pipe' });
        currentModel = modelName;

        llamaServerProcess.stdout?.on('data', (data) => {
            console.log(`[llama.cpp stdout]: ${data}`);
            // Resolve when the server is ready (indicated by a specific log message)
            if (data.toString().includes('server is running')) {
                console.log(`llama.cpp server started successfully on port ${LLAMA_SERVER_PORT}.`);
                resolve();
            }
        });

        llamaServerProcess.stderr?.on('data', (data) => {
            console.error(`[llama.cpp stderr]: ${data}`);
             // Reject if there's an error during startup
            if (data.toString().includes('error')) {
                reject(new Error(`Failed to start llama.cpp server: ${data}`));
            }
        });

        llamaServerProcess.on('close', (code) => {
            console.log(`llama.cpp server process exited with code ${code}`);
            if (currentModel === modelName) { // Avoid issues if we killed it intentionally
               llamaServerProcess = null;
               currentModel = null;
            }
        });

        llamaServerProcess.on('error', (err) => {
            console.error('Failed to start llama.cpp server process.', err);
            reject(err);
        });
    });
};

// API endpoint to get the list of available models
app.get('/api/local-llm/models', (req, res) => {
    try {
        const models = getAvailableModels();
        res.json({ models });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read models directory.' });
    }
});

// API endpoint to handle text generation
app.post('/api/local-llm/generate', async (req, res) => {
    const { model, prompt, stream } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Missing model or prompt in request body.' });
    }

    try {
        // Start or switch the llama.cpp server to the requested model
        await startLlamaServer(model);

        // Forward the request to the llama.cpp server
        const llamaResponse = await fetch(`http://localhost:${LLAMA_SERVER_PORT}/completion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                n_predict: 1024,
                temperature: 0.7,
                stop: ["\nUSER:"], // Stop generation on user token
                stream: stream || false,
                json_schema: req.body.json_schema // Pass schema if provided
            }),
        });

        if (!llamaResponse.ok) {
            const errorBody = await llamaResponse.text();
            throw new Error(`llama.cpp server returned an error: ${llamaResponse.status} ${errorBody}`);
        }
        
        // The llama.cpp server returns JSON directly, so we can just send it on
        const data = await llamaResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Error in /api/local-llm/generate:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.listen(PORT, () => {
    console.log(`Local LLM gateway server is running on http://localhost:${PORT}`);
    console.log(`Models directory: ${MODELS_DIR}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    stopLlamaServer();
    process.exit();
});
