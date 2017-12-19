#version 140

uniform samplerBuffer input;
uniform samplerBuffer secret;
in vec2 point_pos;
/*
mat4 mat_xor(mat4 a, mat4 b) {
  mat4 output;

  for (int i = 0; i < 4; i++) {
    for (int j = 0; j < 4; j++) {
      output[i][j] = a[i][j] ^ b[i][j];
    }
  }

  return output;
}
*/

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

  gl_FragColor = get_write_data(secret_mat);
  //gl_FragColor = vec4(1,1,1,1);
}
