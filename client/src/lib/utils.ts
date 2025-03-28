import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

export function formatTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'h:mm a');
}

export function formatDateTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getFileTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'unknown';
  
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  const documentExtensions = ['doc', 'docx', 'txt', 'rtf', 'odt'];
  const pdfExtensions = ['pdf'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  
  if (audioExtensions.includes(extension)) return 'audio';
  if (videoExtensions.includes(extension)) return 'video';
  if (documentExtensions.includes(extension)) return 'document';
  if (pdfExtensions.includes(extension)) return 'pdf';
  if (imageExtensions.includes(extension)) return 'image';
  
  return 'other';
}

export function getCategoryColor(category: string) {
  const categoryColors: Record<string, { bg: string, text: string, bgDark: string, textDark: string }> = {
    'functional': { 
      bg: 'bg-green-100', 
      text: 'text-green-800',
      bgDark: 'dark:bg-green-800',
      textDark: 'dark:text-green-200'
    },
    'non-functional': { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800',
      bgDark: 'dark:bg-blue-800',
      textDark: 'dark:text-blue-200'
    },
    'security': { 
      bg: 'bg-indigo-100', 
      text: 'text-indigo-800',
      bgDark: 'dark:bg-indigo-800',
      textDark: 'dark:text-indigo-200'
    },
    'performance': { 
      bg: 'bg-purple-100', 
      text: 'text-purple-800',
      bgDark: 'dark:bg-purple-800',
      textDark: 'dark:text-purple-200'
    }
  };
  
  return categoryColors[category.toLowerCase()] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    bgDark: 'dark:bg-gray-700',
    textDark: 'dark:text-gray-300'
  };
}

export function getPriorityInfo(priority: string) {
  const priorityInfo: Record<string, { 
    color: string, 
    bgColor: string, 
    bgDarkColor: string, 
    textDarkColor: string, 
    label: string, 
    icon: any // icon component will be added in the component
  }> = {
    'high': {
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      bgDarkColor: 'dark:bg-red-800',
      textDarkColor: 'dark:text-red-200',
      label: 'H',
      icon: null
    },
    'medium': {
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      bgDarkColor: 'dark:bg-yellow-800',
      textDarkColor: 'dark:text-yellow-200',
      label: 'M',
      icon: null
    },
    'low': {
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      bgDarkColor: 'dark:bg-green-800',
      textDarkColor: 'dark:text-green-200',
      label: 'L',
      icon: null
    }
  };
  
  return priorityInfo[priority.toLowerCase()] || priorityInfo.medium;
}

export function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'audio':
      return 'file-audio';
    case 'video':
      return 'file-video';
    case 'document':
      return 'file-text';
    case 'pdf':
      return 'file-text';
    case 'image':
      return 'image';
    default:
      return 'file';
  }
}

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
