import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface FileData {
    filename: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface StoredFile {
    key: string;       // Unique identifier (path or S3 key)
    location: string;  // Public URL or signed URL
    name: string;      // Original filename
}

export interface StorageProvider {
    upload(file: FileData, folder?: string): Promise<StoredFile>;
    delete(key: string): Promise<void>;
    getUrl(key: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
    private uploadDir = path.join(process.cwd(), 'uploads');

    constructor() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(file: FileData, folder: string = ''): Promise<StoredFile> {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storedFilename = `${uniqueSuffix}-${sanitizedName}`;
        const targetDir = path.join(this.uploadDir, folder);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, storedFilename);
        const key = folder ? `${folder}/${storedFilename}` : storedFilename;

        fs.writeFileSync(filePath, file.buffer);

        // In local dev, we assume the server serves 'uploads' at /uploads
        const location = `/uploads/${key}`;

        return { key, location, name: file.filename };
    }

    async delete(key: string): Promise<void> {
        const filePath = path.join(this.uploadDir, key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    async getUrl(key: string): Promise<string> {
        return `/uploads/${key}`;
    }
}

export class S3StorageProvider implements StorageProvider {
    private s3: S3Client;
    private bucket: string;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        });
        this.bucket = process.env.AWS_BUCKET_NAME || '';
    }

    async upload(file: FileData, folder: string = ''): Promise<StoredFile> {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storedFilename = `${uniqueSuffix}-${sanitizedName}`;
        const key = folder ? `${folder}/${storedFilename}` : storedFilename;

        await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            // ACL: 'public-read' // Optional: depending on if we want public access
        }));

        // Generate a URL (signed or public)
        // For now, let's assume we might want signed URLs for privacy, or standard URLs if public
        // Let's return the standard public URL format for simplicity, but getUrl can sign it
        const location = `https://${this.bucket}.s3.amazonaws.com/${key}`;

        return { key, location, name: file.filename };
    }

    async delete(key: string): Promise<void> {
        await this.s3.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key
        }));
    }

    async getUrl(key: string): Promise<string> {
        // Return a signed URL that expires in 1 hour
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });
        return getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }
}

// Factory to choose provider
export const getStorageService = (): StorageProvider => {
    if (process.env.STORAGE_PROVIDER === 's3' && process.env.AWS_ACCESS_KEY_ID) {
        console.log('Using S3 Storage Provider');
        return new S3StorageProvider();
    }
    console.log('Using Local Storage Provider');
    return new LocalStorageProvider();
};

export const storageService = getStorageService();
