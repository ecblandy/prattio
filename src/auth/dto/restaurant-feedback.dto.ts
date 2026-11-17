import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RestaurantFeedbackDto {
  @IsIn(['suggestion', 'problem'])
  kind!: 'suggestion' | 'problem';

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
