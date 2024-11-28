# Authentication System with React and Express

A secure authentication system implementing password security and CAPTCHA verification using React.js for the frontend and Express.js for the backend.

## Features

- Secure user authentication with JWT
- Password encryption using bcrypt
- Google reCAPTCHA integration
- Email verification
- Two-step authentication
- Reset password
- Protected routes
- Form validation
- Rate limiting
- Cross-Origin Resource Sharing (CORS) protection

## Tech Stack

### Frontend
- React.js 18.3.1
- react-google-recaptcha 3.1.0
- react-router-dom 6.27.0
- Tailwind CSS

### Backend
- Express.js
- bcrypt 5.1.0
- jsonwebtoken 9.0.0
- Prisma (ORM)
- nodemailer 6.9.16
- CORS

## Prerequisites

Before running this project, make sure you have:
- Node.js installed (v14 or higher)
- npm or yarn package manager
- Prisma installed and running
- Google reCAPTCHA API keys

## Installation

1. Clone the repository
```bash
git clone https://github.com/chanmyaephonehein/sunderland.git
cd sunderland
```

2. Install Backend Dependencies
```bash
cd backend
npm install
```

3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

4. Environment Setup

Create `.env` files in both frontend and backend directories.

Backend `.env`:
```
DATABASE_URL="your_postgres_url"
JWT_SECRET="your_jwt_secret"
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"
RECAPTCHA_SECRET_KEY="your_recaptcha_secret_key"
```

Frontend `.env`:
```
REACT_APP_API_URL="http://localhost:5000"
REACT_APP_RECAPTCHA_SITE_KEY="your_recaptcha_site_key"
```

## Running the Application

1. Start the Backend Server
```bash
cd backend
npm start
```

2. Start the Frontend Application
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `POST /multi-factor` - User Login with two-step code
- `POST /verify-email` - Email verification
- `POST /reset-password` - Password reset

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- reCAPTCHA verification
- Rate limiting
- Input validation and sanitization
- Protected routes
- Secure session management

## Development

To run the development environment:

1. Backend
```bash
cd backend
npm start
```

2. Frontend
```bash
cd frontend
npm start
```

## Testing

Run tests using:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC

## Contact

Your Name - [@chanmyaephonehein](https://github.com/chanmyaephonehein)

Project Link: [https://github.com/chanmyaephonehein/sunderland](https://github.com/chanmyaephonehein/sunderland)