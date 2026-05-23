# QuakeRoute - Disaster Resource Allocation Platform

A modern emergency response platform using React.js with quantum-optimized resource allocation visualization.

## 🎯 Project Overview

QuakeRoute is a hackathon-grade disaster management application that allows:
- **Users** to report disaster locations and track resource allocation status
- **Admins** to manage requests, allocate resources, and monitor analytics

### Key Features
- 🗺️ Interactive Google Maps for disaster reporting
- 📊 Real-time allocation tracking with animated progress
- 🎨 Premium dark theme with glassmorphism design
- 📈 Comprehensive analytics dashboards
- ⚡ Simulated quantum optimization workflow

## 🛠️ Tech Stack

- **React.js** with Vite
- **React Router DOM** for routing
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **React Query** for data fetching
- **React Hook Form** for forms
- **Recharts** for analytics charts
- **Lucide React** for icons
- **Google Maps JavaScript API**

## 📁 Project Structure

```
src/
├── user/                 # User Portal
│   ├── pages/           # User pages
│   ├── store/           # User Zustand stores
│   ├── routes/          # User routing
│   ├── App.jsx          # User app entry
│   └── main.jsx         # User entry point
│
├── admin/               # Admin Portal
│   ├── pages/           # Admin pages
│   ├── store/           # Admin Zustand stores
│   ├── routes/          # Admin routing
│   ├── App.jsx          # Admin app entry
│   └── main.jsx         # Admin entry point
│
├── shared/              # Shared resources
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── constants/       # App constants
│   └── layouts/         # Layout components
│
├── api/                 # API layer
│   ├── axios.js         # Axios instance
│   ├── mockApi.js       # Mock API with simulated data
│   └── index.js         # API services
│
└── index.css            # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Maps API Key (optional, maps work without it for demo)

### Installation

1. **Clone and navigate:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Add your Google Maps API key to .env (optional)
   ```

4. **Run the applications:**

   **User Portal (http://localhost:3000):**
   ```bash
   npm run user
   ```

   **Admin Portal (http://localhost:3001):**
   ```bash
   npm run admin
   ```

## 📍 Routes

### User Portal
| Route | Description |
|-------|-------------|
| `/` | Dashboard with overview and quick actions |
| `/report` | Report new disaster with map selection |
| `/allocation-status` | Track allocation progress |
| `/allocation-map` | Visualize resource deployment |

### Admin Portal
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Command center with stats |
| `/admin/requests` | Manage disaster requests |
| `/admin/request/:id` | Request details & allocation |
| `/admin/allocations` | Monitor active allocations |
| `/admin/analytics` | Analytics dashboard |

## 🎨 Design System

### Colors
- **Primary:** Red gradient (#ef4444 → #f97316)
- **Severity:** Green (low) → Orange (medium) → Red (high)
- **Background:** Dark slate (#0f172a)

### Components
All components use glassmorphism design with:
- Backdrop blur effects
- Semi-transparent backgrounds
- Subtle borders
- Smooth Framer Motion animations

## 🔌 API Integration

The app uses mock APIs by default. To connect to a real backend:

1. Set `USE_MOCK_API = false` in `src/api/index.js`
2. Update `VITE_API_BASE_URL` in `.env`
3. Implement the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/disaster/request` | Submit disaster report |
| GET | `/api/allocation/status/:id` | Get allocation status |
| GET | `/api/admin/disasters` | List all disasters |
| GET | `/api/admin/resources/:id` | Get resources for allocation |
| POST | `/api/admin/allocation` | Submit allocation |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/charts` | Chart data |

## 🎯 SDG Alignment

This project contributes to:
- **SDG 11:** Sustainable Cities & Communities
- **SDG 13:** Climate Action

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run default Vite dev server |
| `npm run user` | Run User Portal on port 3000 |
| `npm run admin` | Run Admin Portal on port 3001 |
| `npm run build` | Build for production |
| `npm run build:user` | Build User Portal |
| `npm run build:admin` | Build Admin Portal |

## 🏆 Hackathon Features

- ✅ Real-time allocation tracking with 7-stage progress
- ✅ Animated quantum optimization simulation
- ✅ Interactive disaster/resource map visualization
- ✅ Comprehensive admin analytics with Recharts
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode with glassmorphism UI
- ✅ Smooth Framer Motion animations throughout
- ✅ Production-ready code structure
- ✅ Easy backend integration

## 📄 License

MIT License - Built for hackathon demonstration purposes.
