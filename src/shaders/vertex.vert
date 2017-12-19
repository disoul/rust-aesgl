#version 140

attribute vec2 position;
out vec2 point_pos;

void main() {
  point_pos = position;
  gl_Position = vec4(position, 0.0, 1.0);
}
