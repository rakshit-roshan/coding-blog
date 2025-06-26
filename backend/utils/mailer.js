const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendMail = async (mailOptions) => {
  return transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendMail }; 