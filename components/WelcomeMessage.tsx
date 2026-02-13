'use client';

import { useEffect, useState } from 'react';

interface WelcomeMessageProps {
  userName: string;
  userUsername: string;
}

export default function WelcomeMessage({ userName, userUsername }: WelcomeMessageProps) {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const welcomeKey = `welcome_${userUsername}`;
    if (!localStorage.getItem(welcomeKey)) {
      setShowModal(true);
      localStorage.setItem(welcomeKey, 'true');
    }
  }, [userUsername]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 border-b">
          <h2 className="text-2xl font-bold">Welcome to Russian Roulette! 🎉</h2>
          <p className="text-red-100 mt-2">Hi {userName}! We're thrilled to have you join our community.</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-gray-800 text-sm leading-relaxed">
          <p>
            Here at <strong>Russian Roulette</strong>, you can securely browse, buy, and sell premium digital products, accounts, services, and more — all powered by cryptocurrency transactions in a safe, escrow-protected environment.
          </p>

          <p className="text-red-600 font-semibold">
            To help you get started smoothly and ensure a positive experience for everyone, please take a moment to review these important platform guidelines:
          </p>

          {/* How Transactions Work */}
          <div className="bg-gray-50 p-4 rounded border-l-4 border-red-600">
            <h3 className="font-bold text-gray-900 mb-3">How Transactions Work</h3>
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">1. Browsing & Ordering</p>
                <p className="text-gray-700 ml-4">Explore the Marketplace to find products that interest you. When you're ready, place your order — your funds will be held securely in escrow (not released to the seller yet).</p>
              </div>

              <div>
                <p className="font-semibold text-gray-900">2. Delivery of Item</p>
                <p className="text-gray-700 ml-4">The seller will deliver your purchased item via two channels for your convenience and verification:</p>
                <ul className="ml-8 text-gray-700 space-y-1">
                  <li>• Sent to the registered email associated with your account.</li>
                  <li>• Also delivered directly to your <strong>Inbox</strong> on the Russian Roulette platform.</li>
                  <li>• Check both your email (including spam/junk folder) and your platform inbox shortly after the seller marks the order as "in progress" or "shipped."</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900">3. Verification & Confirmation</p>
                <p className="text-gray-700 ml-4">Once you receive and fully verify the item (test login, check details, ensure it matches the product description), confirm that everything is correct and satisfactory.</p>
                <p className="text-red-600 ml-4 font-semibold">Only after you confirm should you release the funds from escrow to the seller. This protects both buyers and sellers.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-900">4. Releasing Funds</p>
                <ul className="ml-4 text-gray-700 space-y-1">
                  <li>• Go to your <strong>Active Orders</strong> section.</li>
                  <li>• If satisfied → Click to <strong>release escrow</strong> (funds go to the seller).</li>
                  <li>• If there's an issue → Open a <strong>dispute</strong> immediately so our support team can assist.</li>
                  <li>• <strong className="text-red-600">Do not release funds if the item is incorrect, not delivered, or doesn't work as described.</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-600">
            <h3 className="font-bold text-gray-900 mb-3">Quick Tips for New Users</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Always double-check product descriptions before purchasing.</li>
              <li>✓ Keep your account secure — never share login credentials outside the platform.</li>
              <li>✓ Use only cryptocurrencies supported on the platform for deposits and transactions.</li>
              <li>✓ If anything feels off or you need help, reach out via support or check the Help section.</li>
            </ul>
          </div>

          {/* Footer Message */}
          <div className="bg-green-50 p-4 rounded border-l-4 border-green-600">
            <p className="text-gray-800">
              <strong>Your safety and satisfaction are our top priorities.</strong> We use escrow to make every deal fair and secure.
            </p>
            <p className="text-gray-800 mt-2 font-semibold">
              Happy shopping, and welcome aboard, {userName}! 🚀
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-100 p-4 border-t flex gap-3">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition"
          >
            I Understand & Accept
          </button>
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
