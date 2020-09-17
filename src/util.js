
export const makeRequest = (method, params, id) => {
  return JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: id,
  });
};

export const createPromiseResult = (resolve, reject) => {
  return (err, result) => {
    if (err) reject(err);
    else resolve(result);
  };
};

export const createPromiseResultBatch = (resolve, reject, argz) => {
  return (err, result) => {
    if (result && result[0] && result[0].id) {
      // this is a batch request response
      for (let r of result) {
        r.param = argz[r.id];
      }
    }
    if (err) reject(err);
    else resolve(result);
  };
};
