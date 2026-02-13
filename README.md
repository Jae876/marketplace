# Marketplace Platform

A full-stack marketplace platform built with Next.js, featuring cryptocurrency payments, escrow system, and admin management.

## Features

- **User Authentication**: Email/password signup and login with CAPTCHA verification
- **Product Browsing**: Browse products with search and filter by region and type
- **Cryptocurrency Payments**: Support for multiple cryptocurrencies (ETH, BTC, USDT, USDC)
- **Escrow System**: Secure payment holding until delivery confirmation
- **Admin Panel**: Manage products, regions, sizes, and types
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional):
Create a `.env.local` file:
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
JWT_SECRET=your-jwt-secret-key
```

Note: The app includes test CAPTCHA keys by default for development.

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### User Registration & Login

1. Navigate to `/signup` to create an account
2. Complete the CAPTCHA verification
3. Sign in at `/login` with your credentials

### Browsing Products

1. View all products on the homepage
2. Use search bar to find specific products
3. Filter by region and type using the dropdowns

### Making a Purchase

1. Click on any product to view details
2. Click "Buy Now"
3. Select your preferred cryptocurrency
4. Send payment to the generated wallet address
5. Confirm payment after sending
6. Confirm delivery after receiving the item to release escrow

### Admin Panel

1. Log in with an admin account (email containing "admin")
2. Navigate to `/admin`
3. Add, edit, or delete products
4. Manage product details including region, size, type, and price

## Project Structure

```
marketplace/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── products/     # Product endpoints
│   │   ├── admin/        # Admin endpoints
│   │   └── payment/      # Payment endpoints
│   ├── admin/            # Admin panel page
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── product/          # Product detail pages
│   └── page.tsx          # Homepage
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database utilities
│   ├── crypto.ts         # Crypto wallet utilities
│   └── recaptcha.ts      # CAPTCHA utilities
└── data/                 # JSON database files (created automatically)
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: JWT tokens, bcrypt
- **CAPTCHA**: Google reCAPTCHA
- **Cryptocurrency**: ethers.js for wallet generation
- **Database**: File-based JSON (can be upgraded to PostgreSQL/MongoDB)

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- CAPTCHA verification on signup/login
- Admin routes protected with token verification
- Escrow system for secure transactions

## Future Enhancements

- Integration with blockchain for actual payment verification
- Real-time notifications
- Seller accounts and product ownership
- Review and rating system
- Image upload functionality
- Multi-currency support
- Advanced search filters

## License

MIT

