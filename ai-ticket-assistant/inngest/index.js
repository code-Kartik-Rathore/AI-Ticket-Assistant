import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./client.js";
import { onUserSignup } from "./functions/on-signup.js";
import { onTicketCreated } from "./functions/on-ticket-create.js";

const inngestRouter = express.Router();

// Register your Inngest functions here
inngestRouter.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  })
);

export default inngestRouter;
