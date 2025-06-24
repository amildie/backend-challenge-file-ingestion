import express from 'express';
import healthRoute from './routes/health';
import processClientsRoute from './routes/processClients';

const app = express();
const PORT = 3000;

app.use('/health', healthRoute);
app.use('/processClients', processClientsRoute);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
