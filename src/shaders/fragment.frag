#version 140
#extension GL_EXT_gpu_shader4 : enable

uniform usamplerBuffer input;
uniform usamplerBuffer secret;
uniform usamplerBuffer rc;
uniform usampler2D sbox;
in vec2 point_pos;
out uvec4 color;

// 循环左移8bit
int rot8(int input) {
  int a = input << 8;
  int b = input >> 24;

  return a | b;
}

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

/*
 * 通过下标访问sbox数据
 */
float access_sbox_with_index(int x, int y) {
  int _x = x / 4;
  int i = x % 4;
  vec4 vec4data = texelFetch(sbox, ivec2(_x, y), 0);
  float data = vec4data[i];

  return data;
}

float get_sbox_value(int input) {
  int x = input >> 4;
  int y = input << 28 >> 28;

  return access_sbox_with_index(x, y);
}

mat4 sbox_replace(mat4 input) {
  mat4 output;
  output = input;
  for (int i = 0; i < 4; i++) {
    for (int j = 0; j < 4; j++) {
      int value = int(input[i][j]);
      output[i][j] = get_sbox_value(value);
    }
  }

  return output;
}

mat4 row_shift(mat4 input) {
  mat4 output = input;
  output[1][0] = input[1][1];
  output[1][1] = input[1][2];
  output[1][2] = input[1][3];
  output[1][3] = input[1][0];
  output[2][0] = input[2][2];
  output[2][1] = input[2][3];
  output[2][2] = input[2][0];
  output[2][3] = input[2][1];
  output[3][0] = input[3][3];
  output[3][1] = input[3][0];
  output[3][2] = input[3][1];
  output[3][3] = input[3][2];

  return output;
}

/*
 * 左乘混淆算子
 */
vec4 leftmix(vec4 input) {
  mat4 mix_mat;
  mix_mat[0] = vec4(2, 3, 1, 1);
  mix_mat[1] = vec4(1, 2, 3, 1);
  mix_mat[2] = vec4(1, 1, 2, 3);
  mix_mat[3] = vec4(3, 1, 1, 2);

  int v1 = int(mix_mat[0][0] * input[0]) ^ int(mix_mat[0][1] * input[1]) ^ int(mix_mat[0][2] * input[2]) ^ int(mix_mat[0][3] * input[3]);
  int v2 = int(mix_mat[1][0] * input[0]) ^ int(mix_mat[1][1] * input[1]) ^ int(mix_mat[1][2] * input[2]) ^ int(mix_mat[1][3] * input[3]);
  int v3 = int(mix_mat[2][0] * input[0]) ^ int(mix_mat[2][1] * input[1]) ^ int(mix_mat[2][2] * input[2]) ^ int (mix_mat[2][3] * input[3]);
  int v4 = int(mix_mat[3][0] * input[0]) ^ int(mix_mat[3][1] * input[1]) ^ int(mix_mat[3][2] * input[2]) ^ int (mix_mat[3][3] * input[3]);


  return vec4(v1, v2, v3, v4);
}

mat4 mix_columns(mat4 input) {
  vec4 col1 = vec4(input[0][0], input[0][1], input[0][2], input[0][3]);
  vec4 col2 = vec4(input[1][0], input[1][1], input[1][2], input[1][3]);
  vec4 col3 = vec4(input[2][0], input[2][1], input[2][2], input[2][3]);
  vec4 col4 = vec4(input[3][0], input[3][1], input[3][2], input[3][3]);

  vec4 o_col1 = leftmix(col1);
  vec4 o_col2 = leftmix(col2);
  vec4 o_col3 = leftmix(col3);
  vec4 o_col4 = leftmix(col4);
  mat4 output;
  output[0] = vec4(o_col1[0], o_col2[0], o_col3[0], o_col4[0]);
  output[1] = vec4(o_col1[1], o_col2[1], o_col3[1], o_col4[1]);
  output[2] = vec4(o_col1[2], o_col2[2], o_col3[2], o_col4[2]);
  output[3] = vec4(o_col1[3], o_col2[3], o_col3[3], o_col4[3]);

  return output;
}

/**
 * input为32bit数
*/
int secret_func_g(int input, int i) {
  int output = rot8(input);
  int k0 = output >> 24;
  int k1 = output << 8 >> 24;
  int k2 = output << 16 >> 24;
  int k3 = output << 24 >> 24;

  int k0_s = int(get_sbox_value(k0));
  int k1_s = int(get_sbox_value(k1));
  int k2_s = int(get_sbox_value(k2));
  int k3_s = int(get_sbox_value(k3));

  int new_num = (k0_s << 24) | (k1_s << 16) | (k2_s << 8) | k3_s;

  int _i = i / 4;
  int x = i % 4;
  vec4 rc_values = texelFetch(rc, _i);
  int rc_value = int(rc_values[x]);
  rc_value = rc_value << 24;

  return new_num ^ rc_value;
}

mat4 secret_update(mat4 input, int rounds) {
  int w0 = (int(input[0][0]) << 24) | (int(input[1][0]) << 16) | (int(input[2][0]) << 8) | (int(input[3][0]));
  int w1 = (int(input[0][1]) << 24) | (int(input[1][1]) << 16) | (int(input[2][1]) << 8) | (int(input[3][1]));
  int w2 = (int(input[0][2]) << 24) | (int(input[1][2]) << 16) | (int(input[2][2]) << 8) | (int(input[3][2]));
  int w3 = (int(input[0][3]) << 24) | (int(input[1][3]) << 16) | (int(input[2][3]) << 8) | (int(input[3][3]));
  int w4 = w0 ^ secret_func_g(w3, rounds * 4);
  int w5 = w1 ^ w4;
  int w6 = w2 ^ w5;
  int w7 = w3 ^ w6;

  mat4 output = input;
  output[0] = vec4(w4 >> 24, w5 >> 24, w6 >> 24, w7 >> 24);
  output[1] = vec4(w4 << 8 >> 24, w5 << 8 >> 24, w6 << 8 >> 24, w7 << 8 >> 24);
  output[2] = vec4(w4 << 16 >> 24, w5 << 16 >> 24, w6 << 16 >> 24, w7 << 16 >> 24);
  output[3] = vec4(w4 << 24 >> 24, w5 << 24 >> 24, w6 << 24 >> 24, w7 << 24 >> 24);

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

mat4 pipeline(mat4 input, mat4 secret, int rounds) {
  mat4 output = input;
  output = mat_xor(input, secret);
  output = sbox_replace(output);
  output = row_shift(output);
  output = mix_columns(output);

  mat4 new_secret = secret_update(secret, rounds + 1);
  return output;
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

  mat4 output = pipeline(input_mat, secret_mat, 0);
  vec4 data = get_write_data(output);

  gl_FragColor = vec4(data[0] / 255.0, data[1] / 255.0, data[2] / 255.0, data[3] / 255.0);
}
