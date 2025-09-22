import { FastifyReply, FastifyRequest } from "fastify";
import { successResponse } from "../../core/utils/response";
import { generatePrefixedId } from "../../core/models/idGenerator";

import { imageUploader } from "../../core/utils/cloudinary";
import { companyModel } from "./setup.model";

export async function createCompany(req: FastifyRequest, reply: FastifyReply) {
  try {
    // ✅ Parse multipart form data
    const data = await req.file(); // the uploaded logo file
    const fields = req.body as Record<string, any>; // other fields

    // Generate company code
    fields.code = await generatePrefixedId("company", "COM");

    // Upload logo if file exists
    if (data) {
      // data.file is a stream or buffer, can be uploaded directly
      fields.logo = await imageUploader(data.file, "ims-company-logo");
    }

    const newCompany = await companyModel.create(fields);

    reply.send(successResponse(newCompany, "Company created successfully"));
  } catch (err: any) {
    reply.status(400).send({ success: false, message: err.message });
  }
}
