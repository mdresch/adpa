# Enhanced RAG Pipeline Dashboard - Modern Next.js UI

A cutting-edge, real-time monitoring dashboard for your complete RAG (Retrieval-Augmented Generation) pipeline with Pinecone vector search, Governance Knowledge Graph, advanced analytics, performance metrics, and interactive controls.

## 🚀 Features

### **🌲 Pinecone Vector Analytics**
- **Vector Distribution**: Track projects, documents, and entities in Pinecone
- **Index Performance**: Monitor query latency, throughput, and index size
- **Real-time Metrics**: Live vector search statistics and usage analytics
- **Namespace Monitoring**: Track vector distribution across namespaces

### **🕸️ Knowledge Graph Analytics**
- **Node Visualization**: Monitor knowledge graph nodes and relationships
- **Sync Status**: Real-time GKG synchronization monitoring
- **Governance Metrics**: Track compliance, risk assessments, and audit trails
- **Relationship Analysis**: Visualize connection types and graph structure

### **Real-time Monitoring**
- **Live Performance Metrics**: Track embedding, search, and RAG response times in real-time
- **System Health Monitoring**: Monitor MongoDB Atlas, Pinecone, Neo4j, Supabase, and LLM providers
- **Resource Usage**: Track memory, database connections, and API rate limits
- **Activity Feed**: Live stream of system events and operations

### **Interactive Analytics**
- **Performance Charts**: Beautiful, animated charts showing historical performance trends
- **Metric Cards**: Key performance indicators with trend analysis
- **Time Range Selection**: View data by hour, day, or week
- **Real-time Updates**: Automatic data refresh every 10 seconds

### **Modern UI/UX**
- **Glass Morphism Design**: Modern, translucent UI elements with backdrop blur
- **Smooth Animations**: Framer Motion powered micro-interactions
- **Responsive Layout**: Perfect on desktop, tablet, and mobile
- **Dark/Light Themes**: Easy theme switching (coming soon)
- **Gradient Accents**: Beautiful color gradients throughout

### **Advanced Features**
- **Document Upload**: Drag-and-drop file upload with progress tracking
- **Search Testing**: Interactive semantic search testing interface
- **Performance Testing**: One-click benchmark testing
- **Quick Actions**: Common tasks and shortcuts
- **Error Handling**: Comprehensive error states and recovery

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom animations
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State Management**: React Query (TanStack Query)
- **Icons**: Heroicons & Lucide React
- **File Upload**: React Dropzone
- **Notifications**: React Hot Toast
- **TypeScript**: Full type safety

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- RAG Pipeline backend running on port 3002

### Setup

1. **Navigate to dashboard directory**:
```bash
cd dashboard
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

4. **Start the development server**:
```bash
npm run dev
```

5. **Open your browser**:
Navigate to `http://localhost:3000`

## 🎯 Key Components

### **MetricCards**
Animated metric cards showing:
- Total documents and chunks
- Average query times
- Success rates with progress bars
- API rate limits with visual indicators

### **PerformanceChart**
Interactive area chart displaying:
- Embedding latency trends
- Search performance metrics
- RAG response times
- Time range selection (1h, 24h, 7d)

### **SystemStatus**
Real-time service health monitoring:
- MongoDB Atlas connection status
- Embedding service health
- Vector search availability
- LLM provider status
- System resource usage

### **RealtimeMetrics**
Live performance monitoring with:
- Real-time latency updates
- One-click performance testing
- Play/pause monitoring controls
- Animated metric displays

### **QuickActions**
Common operations panel:
- Drag-and-drop document upload
- Search testing interface
- Performance benchmarking
- System settings access

### **ActivityFeed**
Live event stream showing:
- Document processing events
- Search query executions
- System warnings and errors
- Performance test results

## 🎨 Design Features

### **Animations**
- Smooth page transitions
- Hover effects on interactive elements
- Loading states with skeleton screens
- Progress indicators with animations
- Micro-interactions on buttons and cards

### **Responsive Design**
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interactions
- Optimized performance

### **Accessibility**
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- High contrast ratios
- Screen reader compatibility

## 🔧 Configuration

### **API Integration**
The dashboard automatically connects to your RAG pipeline backend through API rewrites configured in `next.config.js`.

### **Customization**
- **Colors**: Modify `tailwind.config.js` for custom color schemes
- **Animations**: Adjust animation timings in components
- **Metrics**: Customize which metrics are displayed
- **Refresh Rates**: Configure update intervals

## 📊 Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component usage
- **Caching**: React Query caching for API responses
- **Bundle Optimization**: Tree shaking and minification
- **Lazy Loading**: Components loaded on demand

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
npm run build
vercel --prod
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Static Export**
```bash
npm run build
npm run export
```

## 🔍 Troubleshooting

### **Common Issues**

1. **API Connection Errors**:
   - Ensure backend is running on port 3002
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`
   - Verify CORS settings on backend

2. **Missing Dependencies**:
   - Run `npm install` in dashboard directory
   - Clear node_modules and reinstall if needed

3. **Build Errors**:
   - Check TypeScript configuration
   - Verify all imports are correct
   - Ensure all dependencies are installed

### **Development Tips**

- Use `npm run lint` to check for code issues
- Run `npm run type-check` for TypeScript validation
- Monitor browser console for runtime errors
- Use React DevTools for component debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review the component documentation
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ using Next.js, Tailwind CSS, and Framer Motion**
