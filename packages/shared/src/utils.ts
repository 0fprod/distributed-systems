// Pauses execution for the given number of milliseconds.
// Used by processFakeInvoice to simulate async PDF generation work.
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Simulates the asynchronous work of generating an invoice PDF.
// In a real system this would call a PDF library and upload to storage.
// The worker calls this before marking the invoice as "completed".
export const processFakeInvoice = async (invoiceId: number): Promise<void> => {
  await sleep(3000); // simulate 3s processing
  console.log(`[worker] Invoice ${invoiceId} processed`);
};
