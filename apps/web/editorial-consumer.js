import { handleEditorialQueue } from "./lib/editorial-queue";

const editorialConsumer = {
  async fetch() {
    return new Response("DIM editorial consumer", { status: 404 });
  },

  async queue(batch, env) {
    await handleEditorialQueue(batch, env);
  },
};

export default editorialConsumer;
