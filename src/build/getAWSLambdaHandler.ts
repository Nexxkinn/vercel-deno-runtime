import { Config } from "@vercel/build-utils/dist";
import { parse, sep } from "path";

export function getAWSLambdaHandler(entrypoint: string, config: Config) {
    if (config.awsLambdaHandler) {
      return config.awsLambdaHandler as string;
    }
  
    if (process.env.NODEJS_AWS_HANDLER_NAME) {
      const { dir, name } = parse(entrypoint);
      return `${dir}${
        dir ? sep : ""
      }${name}.${process.env.NODEJS_AWS_HANDLER_NAME}`;
    }
  
    return "";
  }