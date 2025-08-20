import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ApiResponse } from "#root/common/types";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger: Logger = new Logger(AllExceptionsFilter.name);
	constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		this.logger.error(exception);
		const { httpAdapter } = this.httpAdapterHost;

		const ctx = host.switchToHttp();

		const httpStatus =
			exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		const apiResponse: any = ApiResponse.Error(
			httpStatus,
			exception instanceof Error ? exception.message : exception,
		);

		apiResponse.timestamp = new Date().toISOString();
		apiResponse.path = httpAdapter.getRequestUrl(ctx.getRequest());
		apiResponse.source = "AllExceptionsFilter";

		httpAdapter.reply(ctx.getResponse(), apiResponse, httpStatus);
	}
}
