const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,  // کاهش timeout به 5 ثانیه
      socketTimeoutMS: 45000,           // timeout سوکت
      bufferMaxEntries: 0,              // غیرفعال کردن buffering (حل اصلی timeout!)
      bufferCommands: false,            // جلوگیری از queue کردن commands
      family: 4,                        // IPv4 only برای سرعت
    });
    console.log('✅ Mongoose connected to MongoDB');
  } catch (error) {
    console.error('❌ Mongoose connection error:', error);
    process.exit(1);  // اگر وصل نشد، بات رو kill کن (Render restart می‌کنه)
  }
};

// Event listeners برای reconnection
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected - Reconnecting...');
  setTimeout(connectDB, 5000);  // هر 5 ثانیه دوباره امتحان کن
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose error:', err);
});

// اتصال اولیه
connectDB();
