#include "emscripten.h"
#include "dav1d/src/encode.h"

EMSCRIPTEN_KEEPALIVE
void decode_avif(unsigned char* input_data, int input_size, unsigned char* output_data, int output_size) {
  // Initialize the dav1d decoder
  Dav1dContext* decoder = dav1d_new();

  // Allocate a Dav1dPicture for the output image
  Dav1dPicture output_picture;
  dav1d_picture_alloc(&output_picture, DAV1D_PIXEL_LAYOUT_I444, output_size, output_size);

  // Initialize the Dav1dData struct for the input data
  Dav1dData input_data_struct;
  input_data_struct.sz = input_size;
  input_data_struct.buf = input_data;
  input_data_struct.timestamp = 0;

  // Decode the input AVIF data using dav1d
  dav1d_send_data(decoder, &input_data_struct);
  dav1d_get_picture(decoder, &output_picture);

  // Copy the decoded image data to the output buffer
  int row_size = output_size * sizeof(uint16_t);
  for (int y = 0; y < output_size; y++) {
    uint16_t* src = output_picture.data[0] + y * output_picture.stride[0];
    uint16_t* dest = (uint16_t*) (output_data + y * row_size);
    memcpy(dest, src, row_size);
  }

  // Free the decoder and output picture
  dav1d_picture_unref(&output_picture);
  dav1d_free(decoder);
}
