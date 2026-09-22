import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AskChatDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2000)
  question!: string;
}
