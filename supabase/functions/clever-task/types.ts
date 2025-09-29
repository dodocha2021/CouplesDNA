export interface UploadRecord {
  id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  storage_provider: string;
}

export interface VectorData {
  user_id: string;
  content: string;
  embedding: number[];
  metadata: {
    file_id: string;
    chunk_index: number;
  };
}