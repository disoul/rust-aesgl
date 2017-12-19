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

    let data: &[u8] = &[255, 255, 0, 0, 0, 0, 0, 234, 0, 0, 0, 0, 12, 34, 33, 56, 77, 88, 0];
    let secret: &[u8] = &[145, 23, 0, 0, 23, 0, 0, 0, 3, 0, 0, 10, 0, 0, 55, 0];

    let texture = utils::encode_data_to_texture(data, &display);
    let secret_tex = utils::encode_data_to_texture(secret, &display);

    let (vb, ib) = support::build_rectangle_vb_ib(&display);

    let vertex_shader = get_shader_content("/home/disoul/github/rust-glaes/src/shaders/vertex.vert");
    let fragment_shader = get_shader_content("/home/disoul/github/rust-glaes/src/shaders/fragment.frag");

    let program = glium::Program::from_source(&display, &vertex_shader, &fragment_shader, None);
    let program = match program {
        Ok(p) => p,
        Err(_) => return
    };

    let output = support::build_renderable_texture(&display);
    output.as_surface().clear_color(0.0, 0.0, 0.0, 0.0);
    output.as_surface().draw(&vb, &ib, &program, &uniform!{
        input: &texture,
        secret: &secret_tex,
    },&Default::default()).unwrap();

    println!("get output!");
    let data = utils::decode_data_from_texture(output);

    println!("data{:?}", data);

    display.assert_no_error(None);

}
