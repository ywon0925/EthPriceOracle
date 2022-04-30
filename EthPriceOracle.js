const axios = require('axios')
const BN = require('bn.js')
const Web3 = require('web3')
require('dotenv').config()
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL
const CHUNK_SIZE = process.env.CHUNK_SIZE
const MAX_RETRIES = process.env.MAX_RETRIES
const PROJECT_ID = process.env.PROJECT_ID
const OWNER_ADDRESS = process.env.OWNER_ADDRESS
const OracleJSON = require('./oracle/build/contracts/EthPriceOracle.json')
var pendingRequests = []

const web3 = new Web3(`wss://rinkeby.infura.io/ws/v3/${PROJECT_ID}`)
web3.eth.accounts.wallet.add(process.env.OWNER_PRIVATE_KEY);
const account = web3.eth.accounts.wallet[0].address

// Get Oracle Contract
async function getOracleContract(web3){
    const networkId = await web3.eth.net.getId()
    return new web3.eth.Contract(OracleJSON.abi, OracleJSON.networks[networkId].address)
}

// Get latest Eth price from Binance API
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

// Watch for Events comming from Oracle Contract
async function filterEvents(oracleContract){
    oracleContract.events.GetLatestEthPriceEvent(async (err, event) => {
        if (err) {
            console.error('Error on event', err)
            return
        }
        console.log('Get Latest Eth Price for Requet ' + event.returnValues.id + ' by ' + event.returnValues[0])
        await addRequestToQueue(event);
    })
    oracleContract.events.SetLatestEthPriceEvent(async (err, event) => {
        if (err) {
            console.error('Error on event', err)
            return
        }
        console.log('Requested Latest Eth Price: ' + event.returnValues._ethPrice + ' by ' + event.returnValues._callerAddress)
    }) 
}

// Add Request to Queue
async function addRequestToQueue(event){
    const callerAddress = event.returnValues.callerAddress
    const id = event.returnValues.id
    pendingRequests.push({callerAddress, id})
}

// Process request for CHUNK_SIZE
async function processQueue(oracleContract){
    let processedRequests = 0
    while(pendingRequests.length > 0 && processedRequests < CHUNK_SIZE){
        const req = pendingRequests.shift()
        await processRequest(oracleContract, req.id, req.callerAddress)
        processedRequests++
    }
}

// Process request, if error occurs, retry until it reaches MAX_RETRIES
async function processRequest(oracleContract, id, callerAddress){
    let retries = 0
    while(retries < MAX_RETRIES){
        try {
            const ethPrice = await retrieveLatestEthPrice()
            await setLatestEthPrice(oracleContract, callerAddress, ethPrice, id)
            return
        } catch (error){
            if (retries === MAX_RETRIES - 1){
                await setLatestEthPrice(oracleContract, callerAddress, '0', id)
                return
            }
            retries++
        }
    }
}

// Change received Eth Price in correct form & send it back to Oracle Contract
async function setLatestEthPrice (oracleContract, callerAddress, ethPrice, id) {
    ethPrice = ethPrice.replace('.','') 
    const multiplier = new BN(10**10, 10)
    const ethPriceInt = (new BN(parseInt(ethPrice), 10)).mul(multiplier)
    const idInt = new BN(parseInt(id))
    console.log(ethPrice)
    try {
        await oracleContract.methods.setLatestEthPrice(ethPriceInt.toString(), callerAddress, idInt.toString()).send({ from: account, gas: 45000 })
    } catch (error) {
        console.error('Error encountered while calling setLatestEthPrice.', error)
        // Do some error handling
    }
} 

// Initialize web3 instance using Infura
async function init () {
    const oracleContract = await getOracleContract(web3)
    filterEvents(oracleContract)
    return oracleContract
}

// Listen for user ending program & process a queue & sleep for SLEEP_INTERVAL long
(async () => {
    const oracleContract = await init()
    process.on( 'SIGINT', () => {
      console.log('Calling client.disconnect()')
      process.exit()
    })
    setInterval(async () => {
        await processQueue(oracleContract)
    }, SLEEP_INTERVAL)
})()