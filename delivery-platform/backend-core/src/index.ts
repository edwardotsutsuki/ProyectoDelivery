import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { userRouter } from './modules/users/user.controller';
import { catalogRouter } from './modules/catalog/catalog.controller';
import { orderRouter } from './modules/orders/order.controller';
import { ledgerRouter } from './modules/finance-ledger/ledger.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'backend-core',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/users', userRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/orders', orderRouter);
app.use('/api/ledger', ledgerRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend Core ejecutándose en http://localhost:${PORT}`);
});
