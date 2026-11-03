/** A lost POST response does not mean the transaction failed. Read back once;
 * never repeat a point-changing request automatically. */
export async function reviewWithReconciliation(submit, loadCurrent, toCurrent) {
  try {
    const response = await submit()
    return {
      data: toCurrent(response.data),
      message: response.message,
      reputationScore: response.data.reputationScore,
    }
  } catch (error) {
    if (error.status !== 0 && error.status !== 409) throw error
    try {
      const current = await loadCurrent()
      if (current.data.reputationReviewed) {
        return { data: current.data, message: 'Bài viết đã được xử lý. Đã tải kết quả mới nhất.' }
      }
    } catch {
      // Preserve the original failure when the stored result cannot be confirmed.
    }
    throw error
  }
}
