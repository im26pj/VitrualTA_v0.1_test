export interface Message {
  senderId: string;
  content: string;
  timestamp: string;  // Changed from number to string since we're using ISO strings
  senderName: string;
}
export interface User {
  _id: string;
  fullname: string;
}

export interface FileItem {
  name: string;
  url: string;
}

export interface Group {
  _id: string;
  name: string;
  code: string;
  ownerId: string;
}

export interface GroupDetails {
  members: User[];
  files: FileItem[];
  messages: Message[];
}