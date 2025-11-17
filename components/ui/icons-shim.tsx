import * as React from 'react'
import * as LucideIcons from 'lucide-react'

// Temporary: permissive SvgProps until React SVG types are available in this TS config
type SvgProps = any

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
export const Bell = LucideIcons.Bell
export const Settings = LucideIcons.Settings
export const Sun = LucideIcons.Sun
export const Moon = LucideIcons.Moon
export const Users = LucideIcons.Users
export const User = LucideIcons.User
export const FileText = LucideIcons.FileText
export const MessageSquare = LucideIcons.MessageSquare
export const Send = LucideIcons.Send
export const Unlock = LucideIcons.Unlock
export const LayoutDashboard = LucideIcons.LayoutDashboard
export const LinkIcon = LucideIcons.LinkIcon
export const BarChart3 = LucideIcons.BarChart3
export const Activity = LucideIcons.Activity
export const Zap = LucideIcons.Zap
export const LogOut = LucideIcons.LogOut
export const FolderOpen = LucideIcons.FolderOpen
export const Layers = LucideIcons.Layers

// More permissive mappings for additional commonly used icons
export const Plus = LucideIcons.Plus
export const Minus = LucideIcons.Minus
export const Save = LucideIcons.Save
export const Code = LucideIcons.Code
export const Type = LucideIcons.Type
export const Hash = LucideIcons.Hash
export const ToggleLeft = LucideIcons.ToggleLeft
export const List = LucideIcons.List
export const Copy = LucideIcons.Copy
export const Download = LucideIcons.Download
export const Upload = LucideIcons.Upload
export const Edit = LucideIcons.Edit
export const Trash2 = LucideIcons.Trash2
export const UserCheck = LucideIcons.UserCheck
export const UserX = LucideIcons.UserX
export const Crown = LucideIcons.Crown
export const Key = LucideIcons.Key
export const Mail = LucideIcons.Mail
export const Sparkles = LucideIcons.Sparkles
export const AlertCircle = LucideIcons.AlertCircle
export const CheckCircle = LucideIcons.CheckCircle
export const Filter = LucideIcons.Filter

// Commonly used icons not previously included
export const Calendar = LucideIcons.Calendar
export const DollarSign = LucideIcons.DollarSign
export const Archive = LucideIcons.Archive
export const Loader2 = LucideIcons.Loader2
export const FileUp = LucideIcons.FileUp
export const Wand2 = LucideIcons.Wand2

export const Shield = LucideIcons.Shield

// Additional commonly used icons
export const RefreshCw = LucideIcons.RefreshCw
export const Database = LucideIcons.Database
export const Globe = LucideIcons.Globe
export const Server = LucideIcons.Server
export const Eye = LucideIcons.Eye
export const Clock = LucideIcons.Clock
export const Tag = LucideIcons.Tag
export const Star = LucideIcons.Star
export const Share = LucideIcons.Share
export const Folder = LucideIcons.Folder
export const TrendingUp = LucideIcons.TrendingUp
export const TrendingDown = LucideIcons.TrendingDown
export const ShieldAlert = LucideIcons.ShieldAlert
export const ShieldCheck = LucideIcons.ShieldCheck
export const Lock = LucideIcons.Lock
export const AlertTriangle = LucideIcons.AlertTriangle
export const XCircle = LucideIcons.XCircle
export const TrendingUpIcon = LucideIcons.TrendingUp
export const TrendingDownIcon = LucideIcons.TrendingDown
export const PieChartIcon = LucideIcons.PieChart
export const LineChartIcon = LucideIcons.LineChart
export const Timer = LucideIcons.Timer
export const Cloud = LucideIcons.Cloud
export const ExternalLink = LucideIcons.ExternalLink
export const RotateCcw = LucideIcons.RotateCcw
export const ArrowDownToLine = LucideIcons.ArrowDownToLine
export const ArrowUpFromLine = LucideIcons.ArrowUpFromLine
export const ArrowUpRight = LucideIcons.ArrowUpRight
export const Brain = LucideIcons.Brain
export const Wifi = LucideIcons.Wifi
export const WifiOff = LucideIcons.WifiOff
export const Cpu = LucideIcons.Cpu
export const MemoryStickIcon = LucideIcons.MemoryStick
export const Building = LucideIcons.Building
export const HardDrive = LucideIcons.HardDrive
export const Play = LucideIcons.Play
export const Pause = LucideIcons.Pause
export const History = LucideIcons.History
export const Bold = LucideIcons.Bold
export const Italic = LucideIcons.Italic
export const Underline = LucideIcons.Underline
export const ListOrdered = LucideIcons.ListOrdered
export const AlignLeft = LucideIcons.AlignLeft
export const AlignCenter = LucideIcons.AlignCenter
export const AlignRight = LucideIcons.AlignRight
export const Table = LucideIcons.Table
export const Undo = LucideIcons.Undo
export const Redo = LucideIcons.Redo
export const Edit3 = LucideIcons.Edit3
export const FileImage = LucideIcons.FileImage
export const FileSpreadsheet = LucideIcons.FileSpreadsheet
export const FileCode = LucideIcons.FileCode
export const Presentation = LucideIcons.Presentation
export const FileArchive = LucideIcons.FileArchive
export const FileAudio = LucideIcons.FileAudio
export const FileVideo = LucideIcons.FileVideo
export const File = LucideIcons.File
export const Info = LucideIcons.Info
export const Github = LucideIcons.Github
export const GitBranch = LucideIcons.GitBranch
export const GitPullRequest = LucideIcons.GitPullRequest
export const Sync = LucideIcons.RefreshCw
export const TestTube = LucideIcons.TestTube
export const Crosshair = LucideIcons.Crosshair
export const Target = LucideIcons.Target
export const PieChart = LucideIcons.PieChart
export const Grid = LucideIcons.Grid
export const Lightbulb = LucideIcons.Lightbulb
export const Award = LucideIcons.Award
export const Briefcase = LucideIcons.Briefcase
export const Box = LucideIcons.Box
export const ClipboardList = LucideIcons.ClipboardList
export const Handshake = LucideIcons.Handshake
export const IterationCw = LucideIcons.IterationCw
export const Users2 = LucideIcons.Users2
export const Gauge = LucideIcons.Gauge
export const Rocket = LucideIcons.Rocket
export const Wrench = LucideIcons.Wrench
export const CheckSquare = LucideIcons.CheckSquare
export const Square = LucideIcons.Square
export const FileDown = LucideIcons.FileDown
export const Printer = LucideIcons.Printer

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
  Check,
  Circle,
  PanelLeft,
  GripVertical,
  X,
  ChevronUp,
  IconFallback,
  // All Lucide icons
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
  Printer
}

// All icons are now properly exported above
