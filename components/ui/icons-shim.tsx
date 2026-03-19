import * as React from 'react'
import * as LucideIcons from 'lucide-react'

// Proper SVG props type
type SvgProps = React.ComponentPropsWithoutRef<'svg'>

export const Search = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const ChevronLeft = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const ChevronRight = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export const ChevronDown = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const ArrowLeft = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

export const ArrowRight = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export const MoreHorizontal = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
)

export const MoreVertical = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
)

export const Check = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const Circle = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="8" fill="currentColor" />
  </svg>
)

export const PanelLeft = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
)

export const GripVertical = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
)

export const X = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
export const ChevronUp = (props: SvgProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
)

// Fallback export for other named icons the UI might use
export const IconFallback = (props: SvgProps) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" />
  </svg>
)

// Additional named exports commonly used across the app. These use actual Lucide icons
// Create a tolerant resolver for Lucide icons; fall back to `IconFallback` if missing
const getIcon = (name: string): React.ComponentType<SvgProps> =>
  (((LucideIcons as any)[name] ?? IconFallback) as React.ComponentType<SvgProps>)

export const Bell = getIcon("Bell")
export const Settings = getIcon("Settings")
export const Sun = getIcon("Sun")
export const Moon = getIcon("Moon")
export const Users = getIcon("Users")
export const User = getIcon("User")
export const FileText = getIcon("FileText")
export const MessageSquare = getIcon("MessageSquare")
export const Send = getIcon("Send")
export const Unlock = getIcon("Unlock")
export const LayoutDashboard = getIcon("LayoutDashboard")
export const LinkIcon = getIcon("LinkIcon")
export const BarChart3 = getIcon("BarChart3")
export const Activity = getIcon("Activity")
export const Zap = getIcon("Zap")
export const LogOut = getIcon("LogOut")
export const FolderOpen = getIcon("FolderOpen")
export const Layers = getIcon("Layers")

// More permissive mappings for additional commonly used icons
export const Plus = getIcon("Plus")
export const Minus = getIcon("Minus")
export const Save = getIcon("Save")
export const Code = getIcon("Code")
export const Type = getIcon("Type")
export const Hash = getIcon("Hash")
export const ToggleLeft = getIcon("ToggleLeft")
export const List = getIcon("List")
export const Copy = getIcon("Copy")
export const Download = getIcon("Download")
export const Upload = getIcon("Upload")
export const Edit = getIcon("Edit")
export const Trash2 = getIcon("Trash2")
export const UserCheck = getIcon("UserCheck")
export const UserX = getIcon("UserX")
export const Crown = getIcon("Crown")
export const Key = getIcon("Key")
export const Mail = getIcon("Mail")
export const Sparkles = getIcon("Sparkles")
export const AlertCircle = getIcon("AlertCircle")
export const CheckCircle = getIcon("CheckCircle")
export const Filter = getIcon("Filter")

// Commonly used icons not previously included
export const Calendar = getIcon("Calendar")
export const DollarSign = getIcon("DollarSign")
export const Archive = getIcon("Archive")
export const Loader2 = getIcon("Loader2")
export const FileUp = getIcon("FileUp")
export const Wand2 = getIcon("Wand2")

export const Shield = getIcon("Shield")

// Additional commonly used icons
export const RefreshCw = getIcon("RefreshCw")
export const Database = getIcon("Database")
export const Globe = getIcon("Globe")
export const Server = getIcon("Server")
export const Eye = getIcon("Eye")
export const Clock = getIcon("Clock")
export const Tag = getIcon("Tag")
export const Star = getIcon("Star")
export const Share = getIcon("Share")
export const Folder = getIcon("Folder")
export const TrendingUp = getIcon("TrendingUp")
export const TrendingDown = getIcon("TrendingDown")
export const ShieldAlert = getIcon("ShieldAlert")
export const ShieldCheck = getIcon("ShieldCheck")
export const Lock = getIcon("Lock")
export const AlertTriangle = getIcon("AlertTriangle")
export const TriangleAlert = getIcon("TriangleAlert")
export const XCircle = getIcon("XCircle")
export const TrendingUpIcon = getIcon("TrendingUp")
export const TrendingDownIcon = getIcon("TrendingDown")
export const PieChartIcon = getIcon("PieChart")
export const LineChartIcon = getIcon("LineChart")
export const Timer = getIcon("Timer")
export const Cloud = getIcon("Cloud")
export const ExternalLink = getIcon("ExternalLink")
export const RotateCcw = getIcon("RotateCcw")
export const ArrowDownToLine = getIcon("ArrowDownToLine")
export const ArrowUpFromLine = getIcon("ArrowUpFromLine")
export const ArrowUpRight = getIcon("ArrowUpRight")
export const ArrowDownRight = getIcon("ArrowDownRight")
export const Brain = getIcon("Brain")
export const Wifi = getIcon("Wifi")
export const WifiOff = getIcon("WifiOff")
export const Cpu = getIcon("Cpu")
export const MemoryStick = getIcon("MemoryStick")
export const MemoryStickIcon = getIcon("MemoryStick")
export const Building = getIcon("Building")
export const HardDrive = getIcon("HardDrive")
export const Play = getIcon("Play")
export const Pause = getIcon("Pause")
export const History = getIcon("History")
export const Bold = getIcon("Bold")
export const Italic = getIcon("Italic")
export const Underline = getIcon("Underline")
export const ListOrdered = getIcon("ListOrdered")
export const AlignLeft = getIcon("AlignLeft")
export const AlignCenter = getIcon("AlignCenter")
export const AlignRight = getIcon("AlignRight")
export const Table = getIcon("Table")
export const Undo = getIcon("Undo")
export const Redo = getIcon("Redo")
export const Edit3 = getIcon("Edit3")
export const FileImage = getIcon("FileImage")
export const FileSpreadsheet = getIcon("FileSpreadsheet")
export const FileCode = getIcon("FileCode")
export const Presentation = getIcon("Presentation")
export const FileArchive = getIcon("FileArchive")
export const FileAudio = getIcon("FileAudio")
export const FileVideo = getIcon("FileVideo")
export const File = getIcon("File")
export const FileCheck = getIcon("FileCheck")
export const Info = getIcon("Info")
export const Github = getIcon("Github")
export const GitBranch = getIcon("GitBranch")
export const GitPullRequest = getIcon("GitPullRequest")
export const Sync = getIcon("RefreshCw")
export const TestTube = getIcon("TestTube")
export const Crosshair = getIcon("Crosshair")
export const Target = getIcon("Target")
export const PieChart = getIcon("PieChart")
export const Grid = getIcon("Grid")
export const Lightbulb = getIcon("Lightbulb")
export const Award = getIcon("Award")
export const Briefcase = getIcon("Briefcase")
export const Box = getIcon("Box")
export const ClipboardList = getIcon("ClipboardList")
export const Handshake = getIcon("Handshake")
export const IterationCw = getIcon("IterationCw")
export const Users2 = getIcon("Users2")
export const Gauge = getIcon("Gauge")
export const Rocket = getIcon("Rocket")
export const Wrench = getIcon("Wrench")
export const CheckSquare = getIcon("CheckSquare")
export const Square = getIcon("Square")
export const FileDown = getIcon("FileDown")
export const Printer = getIcon("Printer")
export const BookOpen = getIcon("BookOpen")

// PMBOK 8 Domain-specific icons
export const CheckCircle2 = getIcon("CheckCircle2")
export const Building2 = getIcon("Building2")
export const Ruler = getIcon("Ruler")
export const Wallet = getIcon("Wallet")
export const UserCog = getIcon("UserCog")

// Resource Capacity Management icons
export const Plane = getIcon("Plane")
export const Stethoscope = getIcon("Stethoscope")
export const GraduationCap = getIcon("GraduationCap")
export const Baby = getIcon("Baby")
export const FileSearch = getIcon("FileSearch")

// Default export with all icons
export default {
  // Explicitly exported components
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  MoreVertical,
  Check,
  Circle,
  PanelLeft,
  GripVertical,
  X,
  ChevronUp,
  IconFallback,
  // All Lucide icons (tolerant resolver)
  Bell,
  Settings,
  Sun,
  Moon,
  Users,
  User,
  FileText,
  MessageSquare,
  Send,
  Unlock,
  LayoutDashboard,
  LinkIcon,
  BarChart3,
  Activity,
  Zap,
  LogOut,
  FolderOpen,
  Layers,
  Plus,
  Minus,
  Save,
  Code,
  Type,
  Hash,
  ToggleLeft,
  List,
  Copy,
  Download,
  Upload,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  Key,
  Mail,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Filter,
  Calendar,
  DollarSign,
  Archive,
  Loader2,
  FileUp,
  Wand2,
  Shield,
  RefreshCw,
  Database,
  Globe,
  Server,
  Eye,
  Clock,
  Tag,
  Star,
  Share,
  Folder,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  XCircle,
  TrendingUpIcon,
  TrendingDownIcon,
  PieChartIcon,
  LineChartIcon,
  Timer,
  Cloud,
  ExternalLink,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Brain,
  Wifi,
  WifiOff,
  Cpu,
  MemoryStick,
  MemoryStickIcon,
  Building,
  HardDrive,
  Play,
  Pause,
  History,
  Bold,
  Italic,
  Underline,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Undo,
  Redo,
  Edit3,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Presentation,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  FileCheck,
  Info,
  Github,
  GitBranch,
  GitPullRequest,
  Sync,
  TestTube,
  Crosshair,
  Target,
  PieChart,
  Grid,
  Lightbulb,
  Award,
  Briefcase,
  Box,
  ClipboardList,
  Handshake,
  IterationCw,
  Users2,
  Gauge,
  Rocket,
  Wrench,
  CheckSquare,
  Square,
  FileDown,
  Printer,
  BookOpen,
  // PMBOK 8 Domain-specific icons
  CheckCircle2,
  Building2,
  Ruler,
  Wallet,
  UserCog,
  FileSearch
}

// All icons are now properly exported above
