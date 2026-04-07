import { Jimp } from 'jimp';
import fs from 'fs';

async function cropImage() {
  try {
    console.log('Loading image...');
    const image = await Jimp.read('./public/banner-libertadores.png');
    
    // Autocrop removes borders of the same color as the top-left pixel.
    image.autocrop();
    
    await image.write('./public/banner-libertadores-cropped.png');
    console.log('Image cropped successfully!');
  } catch (err) {
    console.error('Error cropping image:', err);
  }
}

cropImage();
