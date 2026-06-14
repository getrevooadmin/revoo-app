import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 B2B Loyalty & Feedback REST API running on port ${PORT}`);
  console.log(`🎯 Mock Target Time active: 2026-06-14T15:41:53-06:00`);
});
