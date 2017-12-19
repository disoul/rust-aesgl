#version 140
#extension GL_EXT_gpu_shader4 : enable

uniform usamplerBuffer input;
uniform usamplerBuffer secret;
in vec2 point_pos;
out uvec4 color;

// 44矩阵亦或
mat4 mat_xor(mat4 a, mat4 b) {
  mat4 output;

  for (int i = 0; i < 4; i++) {
    for (int j = 0; j < 4; j++) {
      output[i][j] = int(a[i][j]) ^ int(b[i][j]);
    }
  }

  return output;
}

vec4 get_write_data(mat4 data) {
  if (point_pos.y <= -0.5) {
    return data[0];
  } else if (point_pos.y <= 0) {
    return data[1];
  } else if (point_pos.y <= 0.5) {
    return data[2];
  } else {
    return data[3];
  }
}
void main() {
  mat4 input_mat;
  input_mat[0] = texelFetch(input, 0);
  input_mat[1] = texelFetch(input, 1);
  input_mat[2] = texelFetch(input, 2);
  input_mat[3] = texelFetch(input, 3);

  mat4 secret_mat;
  secret_mat[0] = texelFetch(secret, 0);
  secret_mat[1] = texelFetch(secret, 1);
  secret_mat[2] = texelFetch(secret, 2);
  secret_mat[3] = texelFetch(secret, 3);

  vec4 a = get_write_data(mat_xor(input_mat, secret_mat));
  gl_FragColor = vec4(a[0] / 255.0, a[1] / 255.0, a[2] / 255.0, a[3] / 255.0);
}
