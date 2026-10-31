/**
 * Wraps an InvokeLLM promise with a timeout. If the LLM doesn't respond
 * within timeoutMs, returns the fallback result instead.
 *
 * @param {Promise} llmPromise - The InvokeLLM promise
 * @param {Function} fallbackFn - Returns fallback data if LLM times out or errors
 * @param {number} timeoutMs - Max wait time in ms (default 6500)
 * @returns {Promise<{data: any, timedOut: boolean}>}
 */
export async function invokeLLMWithTimeout(llmPromise, fallbackFn, timeoutMs = 6500) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const result = await Promise.race([llmPromise, timeoutPromise]);
    if (result == null) {
      return { data: fallbackFn(), timedOut: true };
    }
    return { data: result, timedOut: false };
  } catch (e) {
    return { data: fallbackFn(), timedOut: true };
  }
}