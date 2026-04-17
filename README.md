# TallyFlow ERP 🚀

TallyFlow is a professional MERN-stack ERP and Billing solution designed for small to medium businesses. It handles everything from GST-compliant invoicing to bank-specific QR payment management and detailed statement of accounts.

## 🌟 Features

- **GST Compliant Invoicing:** Generate Official GST Invoices, Local Estimates (Kacchi Parchi), and Delivery Challans.
- **Smart GST Detection:** Automatically extracts State Name, State Code, and PAN from GSTIN for faster data entry.
- **Bank-Specific QR Codes:** Centralized QR management in company profile. Each bank account can have its own QR which automatically appears on relevant invoices.
- **Professional Design:** High-contrast, symmetrical invoice layouts with dark borders for crisp printing and PDF generation.
- **Statement of Accounts:** Track transactions, outstanding balances, and payment history for both customers and workers.
- **Persistent Data:** Draft saving feature to prevent data loss during navigation.
- **User Authentication:** Secure JWT-based login and profile management.
- **Dashboard Analytics:** Visual representation of business health using charts.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Redux Toolkit, Chart.js, React Icons.
- **Backend:** Node.js, Express, Mongoose (MongoDB).
- **Styling:** Vanilla CSS with a modern, glassmorphic design system.
- **State Management:** Redux for global state and LocalStorage for secure data persistence.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tallyflow-erp.git
   cd tallyflow-erp
   ```

2. **Setup Server:**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory (use `.env.example` as a template).

3. **Setup Client:**
   ```bash
   cd ../client
   npm install
   ```

### Running the App

1. **Start Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Client:**
   ```bash
   cd client
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## 📸 Screenshots

*(Add your screenshots here after deployment)*

## 📄 License

This project is licensed under the ISC License.
