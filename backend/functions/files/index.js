const { uploadFile, uploadFiles } = require("../../lib/s3");
const { ok, badRequest, serverError } = require("../../lib/dynamo");

// Upload single file
async function uploadSingleFile(event) {
    try {
        const body = JSON.parse(event.body || "{}");
        const { fileData, fileName, fileType, folder = 'attachments' } = body;
        
        if (!fileData || !fileName || !fileType) {
            return badRequest("fileData, fileName, and fileType are required");
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileData, 'base64');
        const file = {
            name: fileName,
            type: fileType,
            size: fileBuffer.length,
            buffer: fileBuffer
        };

        const result = await uploadFile(file, folder);
        return ok(result);
    } catch (e) {
        console.error('Upload single file error:', e);
        return serverError(e);
    }
}

// Upload multiple files
async function uploadMultipleFiles(event) {
    try {
        const body = JSON.parse(event.body || "{}");
        const { files, folder = 'attachments' } = body;
        
        if (!files || !Array.isArray(files)) {
            return badRequest("files array is required");
        }

        // Convert base64 files to buffers
        const fileObjects = files.map(fileData => ({
            name: fileData.fileName,
            type: fileData.fileType,
            size: Buffer.from(fileData.fileData, 'base64').length,
            buffer: Buffer.from(fileData.fileData, 'base64')
        }));

        const results = await uploadFiles(fileObjects, folder);
        return ok(results);
    } catch (e) {
        console.error('Upload multiple files error:', e);
        return serverError(e);
    }
}

// CORS options
async function options(event) {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
        },
        body: ""
    };
}

module.exports = {
    uploadSingleFile,
    uploadMultipleFiles,
    options
};
