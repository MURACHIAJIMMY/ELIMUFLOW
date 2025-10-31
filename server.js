const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
const connectDB = require('./config/db');
connectDB();

// ✅ Base route
app.get('/', (req, res) => res.send('ElimuFlow API running'));

// ✅ Route imports
const subjectRoutes = require('./routes/subjectRoutes'); // ✅ NEW: Dedicated subject controller
const subjectSelectionRoutes = require('./routes/subjectSelectionRoutes');
const studentRoutes = require('./routes/studentRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const authRoutes = require('./routes/authRoutes');
const pathwayRoutes = require('./routes/pathwayRoutes');
const trackRoutes = require('./routes/trackRoutes');
const classRoutes = require('./routes/classRoutes');
const paperConfigRoutes = require('./routes/PaperConfigRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const promotionRoute = require('./routes/promotionRoute');


// ✅ Route mounting
app.use('/api/subjects', subjectRoutes); // ✅ NEW: Subject creation, listing, filtering
app.use('/api/subject-selection', subjectSelectionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pathways', pathwayRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/classes', classRoutes);
app.use('/api', paperConfigRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/admin', promotionRoute);
// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}🚀🚀`));
// ✅ Promotion scheduler
const cron = require('node-cron');
const promoteStudents = require('./utils/promoteStudents');

// ⏰ Run every January 3rd at 2:00 AM
cron.schedule('0 2 3 1 *', () => {
  console.log('📅 Running annual promotion...');
  promoteStudents();
});
// cron.schedule('* * * * *', () => {
//   console.log('🧪 Running test promotion...');
//   promoteStudents();
// });
