import NeoxrApi from '@neoxr/api'

class APIWrapper {
  constructor() {
    this.neoxrClient = new NeoxrApi('https://api.neoxr.eu/api', 'vaxM18')
  }

  async neoxr(path, params = {}) {
    try {
      return await this.neoxrClient.neoxr(path, params)
    } catch (e) {
      console.error('Neoxr error:', e)
      throw e
    }
  }
}  

const Api = new APIWrapper()
export default Api