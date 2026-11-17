process.once("message", async (message) => {
  try {
    const result = await require("./documentText").rawExtract(
      Buffer.from(message.buffer),
      message.name,
    );
    process.send({ success: true, result }, () => process.exit(0));
  } catch (error) {
    process.send(
      {
        success: false,
        message: error.status
          ? error.message
          : "The document could not be processed safely.",
        status: error.status || 422,
      },
      () => process.exit(0),
    );
  }
});
