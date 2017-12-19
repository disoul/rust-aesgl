extern crate glium;

use glium::Surface;
use glium::texture::buffer_texture::BufferTexture;
use glium::texture::buffer_texture::BufferTextureType;

pub fn encode_data_to_texture<F: ?Sized>(data: &[u8], facade: &F) -> BufferTexture<(u8,u8,u8,u8)> where F: glium::backend::Facade {
    let mut buffer_data: &mut[(u8,u8,u8,u8); 4] = &mut[(0,0,0,0), (0,0,0,0), (0,0,0,0), (0,0,0,0)];
    for i in 0..4 {
        let buffer_data = &mut buffer_data;
        buffer_data[i] = (data[i * 4 + 0], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]);
    }
    let texture = BufferTexture::new(facade, buffer_data, BufferTextureType::Unsigned);

    let texture: BufferTexture<(u8,u8,u8,u8)> = match texture {
        Ok(t) => t,
        Err(_) => panic!("Buffer Texture Error!")
    };

    texture
}

pub fn decode_data_from_texture(texture: glium::Texture2d) -> Vec<u8> {
    let mut data_vec = vec![];
    let data: Vec<Vec<(u8, u8, u8, u8)>> = texture.read();
    
    for (y, row) in data.iter().enumerate() {
        for (x, pixel) in row.iter().enumerate() {
            /*
             * 单个计算下贴图大小为固定1 * 4
             */
            data_vec.push(pixel.0);
            data_vec.push(pixel.1);
            data_vec.push(pixel.2);
            data_vec.push(pixel.3);
        }
    }

    return data_vec;
}
