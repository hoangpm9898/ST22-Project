
const fs = require('fs');
const { Client } = require('basic-ftp');
const { Readable } = require('stream');

const uploadCDN = async (filePath, destination) => {

  const client = new Client();
  client.ftp.verbose = false;

  // Tạo URL công khai để truy cập file
  const publicUrl = `https://${process.env.BUNNY_CDN_ACCESS}/${destination}`;

  try {
    // Kết nối tới Bunny CDN qua FTP
    await client.access({
      host: process.env.BUNNY_CDN_HOST,
      port: 21,
      user: process.env.BUNNY_CDN_USERNAME,
      password: process.env.BUNNY_CDN_PASSWD,
      secure: true,
    });

    // Tạo readStream từ filePath
    let readStream;
    
    if (typeof filePath === 'string') {
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }
      readStream = fs.createReadStream(filePath);
    } else {
      // Chuyển Buffer thành Readable stream
      readStream = Readable.from(filePath);
    }

    // Tạo thư mục đích nếu chưa tồn tại (Bunny CDN yêu cầu thư mục phải tồn tại)
    // const directory = destination.substring(0, destination.lastIndexOf('/'));
    // if (directory) {
    //   await client.ensureDir(directory);
    // }

    // Upload file lên Bunny CDN
    await client.uploadFrom(readStream, destination);
    
    return { success: true, url: publicUrl };

  } catch (error) {
    return { success: false, message: `Failed to upload to CDN (${publicUrl}): ${error.message}`};
  } finally {
    client.close(); // Đóng kết nối FTP
  }
}

module.exports = { uploadCDN };