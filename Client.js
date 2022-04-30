//const common = require('./utils/common.js')
require('dotenv').config()
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL
const CallerJSON = require('./caller/build/contracts/CallerContract.json')
const OracleJSON = require('./oracle/build/contracts/EthPriceOracle.json')
const PROJECT_ID = process.env.CALLER_PROJECT_ID
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://rinkeby.infura.io/ws/v3/${PROJECT_ID}`))
//const web3 = new Web3(`wss://rinkeby.infura.io/ws/v3/${PROJECT_ID}`)
web3.eth.accounts.wallet.add(process.env.CALLER_PRIVATE_KEY);
const account = web3.eth.accounts.wallet[0].address

async function getCallerContract () {
  const networkId = await web3.eth.net.getId()
  console.log(networkId)
  return new web3.eth.Contract(CallerJSON.abi, CallerJSON.networks[networkId].address)
}

async function retrieveLatestEthPrice () {
  const resp = await axios({
    url: 'https://api.binance.com/api/v3/ticker/price',
    params: {
      symbol: 'ETHUSDT'
    },
    method: 'get'
  })
  return resp.data.price
}

async function filterEvents (callerContract) {
  callerContract.events.newOracleAddressEvent({ filter: {} }, async (err, event) =>{
    if (err) console.error('Error on newOracleAddressEvent', err)
    console.log('* New Oracle Address: ' + event.returnValues.oracleAddress)
  })
  callerContract.events.PriceUpdatedEvent({ filter: { } }, async (err, event) => {
    if (err) console.error('Error on PriceUpdatedEvent', err)
    console.log('* New PriceUpdated event. ethPrice: ' + event.returnValues.ethPrice)
  })
  callerContract.events.ReceivedNewRequestIdEvent({ filter: { } }, async (err, event) => {
    if (err) console.error('Error on ReceivedNewRequestIdEvent', err)
    console.log('New Request Received. ID: ' + event.returnValues.id)
  })
}

async function init () {
  const callerContract = await getCallerContract()
  filterEvents(callerContract)
  return callerContract
}

(async () => {
  const callerContract = await init()
  process.on( 'SIGINT', () => {
    console.log('Calling client.disconnect()')
    process.exit( );
  })
  const networkId = await web3.eth.net.getId()
  const oracleAddress =  OracleJSON.networks[networkId].address
  await callerContract.methods.setOracleInstanceAddress(oracleAddress).send({ from: account, gas: 1000000 })
  await callerContract.methods.updateEthPrice().send({ from: account, gas: 1000000 })

//  setInterval( async () => {
  //  await callerContract.methods.updateEthPrice().send({ from: account, gas: 1000000 })
  //}, SLEEP_INTERVAL);
})()
