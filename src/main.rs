#[macro_use]
extern crate glium;
extern crate image;

use glium::Surface;
use glium::texture::buffer_texture::BufferTexture;
use glium::texture::buffer_texture::BufferTextureType;

use std::env;
use std::fs::File;
use std::io::prelude::*;

mod support;
mod utils;


fn get_shader_content(name: &'static str) -> String {
    let mut f = File::open(name).expect("can not find shader file");
    let mut contents = String::new();

    f.read_to_string(&mut contents).expect("read shader file error");

    return contents;
}


fn main() {
    use glium::{glutin, Surface};

    let mut events_loop = glutin::EventsLoop::new();

    let window = glutin::WindowBuilder::new().with_visibility(false);
    let context = glutin::ContextBuilder::new();
    let display = glium::Display::new(window, context, &events_loop).unwrap();

    let input_data = utils::read_file_as_bytes("input.in");

    // 密钥只会取其前16字节
    let secret_data = utils::read_file_as_bytes("secret.in");
    println!("input{:?}", secret_data);

    let data_size = (input_data.len() as f32 / 16.0 as f32).ceil() as u32;

    let texture = utils::encode_data_to_texture(input_data, &display);
    let secret_tex = utils::encode_data_to_texture(secret_data, &display);

    let RC: &[(u8, u8, u8, u8);3] = &[(0x00, 0x01, 0x02, 0x04), (0x08, 0x10, 0x20, 0x40), (0x80, 0x1B, 0x36, 0x00)];
    let RC_tex: BufferTexture<(u8, u8, u8, u8)> = match BufferTexture::new(
        &display,
        RC,
        BufferTextureType::Unsigned
    ) {
        Err(_) => panic!("RC texture error"),
        Ok(t) => t
    };

    let sbox_tex = utils::get_sbox_texture(&display);

    let (vb, ib) = support::build_rectangle_vb_ib(&display);

    let vertex_shader = include_str!("shaders/vertex.vert");
    let fragment_shader = include_str!("shaders/fragment.frag");

    let program = glium::Program::from_source(&display, &vertex_shader, &fragment_shader, None);
    let program = match program {
        Ok(p) => p,
        Err(_) => return
    };

    // 根据数据长度生成4 * n的贴图
    let output = support::build_renderable_texture(&display, data_size);
    output.as_surface().clear_color(0.0, 0.0, 0.0, 0.0);
    output.as_surface().draw(&vb, &ib, &program, &uniform!{
        input: &texture,
        secret: &secret_tex,
        sbox: &sbox_tex,
        rc: &RC_tex,
        size: data_size,
    },&Default::default()).unwrap();

    println!("get output!");
    let data = utils::decode_data_from_texture(output);
    println!("data{:?}, len{}", data, data.len());

    let s =utils::bytes_to_hex_string(data);
    println!("out: {}", s);

    display.assert_no_error(None);

}
