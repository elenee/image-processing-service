import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Image {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  key: string;

  @Prop()
  size: number;

  @Prop()
  mimetype: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: mongoose.Schema.Types.ObjectId;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
