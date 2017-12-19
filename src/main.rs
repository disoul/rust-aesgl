#[macro_use]
extern crate glium;
extern crate image;

use glium::Surface;
use glium::texture::buffer_texture::BufferTexture;
use glium::texture::buffer_texture::BufferTextureType;

mod support;
mod utils;


fn main() {
    use glium::{glutin, Surface};

    let mut events_loop = glutin::EventsLoop::new();

    let window = glutin::WindowBuilder::new().with_visibility(false);
    let context = glutin::ContextBuilder::new();
    let display = glium::Display::new(window, context, &events_loop).unwrap();

    let data: &[u8] = &[255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 34, 33, 56, 77, 88, 0];

    let texture = utils::encode_data_to_texture(data, &display);
    /*
    let texture: BufferTexture<(u8,u8,u8,u8)> = match texture {
        Ok(t) => t,
        Err(_) => return
    };
    */

    let (vb, ib) = support::build_rectangle_vb_ib(&display);

    let program = glium::Program::from_source(&display,
    "
        #version 140
        attribute vec2 position;
        out vec2 my_pos;

        void main() {
            my_pos = position;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    ",
    "
        #version 140
        uniform samplerBuffer tex;
        in vec2 my_pos;
        in vec2 gl_PointCoord;
        in vec4 gl_FragCoord;
        void main() {
            if (my_pos.y <= -0.5) {
                gl_FragColor = texelFetch(tex, 0);
            } else if (my_pos.y <= 0) {
                gl_FragColor = texelFetch(tex, 1);
            } else if (my_pos.y <= 0.5) {
                gl_FragColor = texelFetch(tex, 2);
            } else {
                gl_FragColor = texelFetch(tex, 3);
            }
        }
    ",
    None);
    let program = match program {
        Ok(p) => p,
        Err(_) => return
    };

    let output = support::build_renderable_texture(&display);
    output.as_surface().clear_color(0.0, 0.0, 0.0, 0.0);
    output.as_surface().draw(&vb, &ib, &program, &uniform!{ tex: &texture },
                                &Default::default()).unwrap();

    let data = utils::decode_data_from_texture(output);
    /*
    let data: Vec<Vec<(u8, u8, u8, u8)>> = output.read();
    let buffer_data = texture.read();
    let buffer_data = match buffer_data {
        Ok(p) => p,
        Err(_) => return
    };
    println!("pixel{:?}", buffer_data);
    for (y, row) in data.iter().enumerate() {
        for (x, pixel) in row.iter().enumerate() {
            println!("x {}, y {}", x, y);
            println!("pixel{:?}", pixel);
        }
    }
    */
    println!("data{:?}", data);

    display.assert_no_error(None);

}
