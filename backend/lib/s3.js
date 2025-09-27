const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuid } = require("uuid");

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET || 'mindshare-attachments';

// Upload file to S3
async function uploadFile(file, folder = 'attachments') {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${folder}/${uuid()}.${fileExtension}`;
        
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.type
        };

        await s3Client.send(new PutObjectCommand(uploadParams));
        
        return {
            fileName,
            url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        console.error('File details:', { name: file.name, type: file.type, size: file.size });
        throw error;
    }
}

// Get signed URL for file access
async function getFileUrl(fileName) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        return url;
    } catch (error) {
        console.error('Error getting file URL:', error);
        throw error;
    }
}

// Upload multiple files
async function uploadFiles(files, folder = 'attachments') {
    const uploadPromises = files.map(file => uploadFile(file, folder));
    return Promise.all(uploadPromises);
}

module.exports = {
    uploadFile,
    uploadFiles,
    getFileUrl,
    s3Client
};
