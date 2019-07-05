import Web3 from 'web3';


class BcExplorer {
    constructor() {
        this.web3inst = null;
        this.contractInst = [];
        this.info = {
            isConnected: false,
            networkId: 0,
            coinbase: null,
            mainAccount: null,
            balance: 0,
            addressUrl: null
        }
    }
    web3() {
        if (typeof web3 != 'undefined') return web3;
        else if (typeof window.web3 != 'undefined') return window.web3;
        if (this.web3inst) return this.web3inst;

        console.error('BcExplorerError: Web3 is not initilized!');
    }
    /**
     * initialize web3 instance
     * @param {} addressUrl 
     */
    init(addressUrl) {
        return new Promise((resolve, reject) => {
            if (window.ethereum) {
                window.web3 = new Web3(ethereum);

                try {
                    ethereum.enable()
                        .then(() => {
                            this.setWeb3(window.web3, addressUrl);
                            resolve(window.web3);
                        }).catch((error) =>
                            reject(error));
                } catch (error) {
                    reject(error);
                }
            } else {
                if (typeof web3 != 'undefined') {
                    var web3js = new Web3(web3.currentProvider);
                } else {
                    if (typeof web3 == 'undefined') {
                        reject(new Error('BcExplorer error: impossible to connect'));
                    }

                    var provider = new Web3.providers.HttpProvider(addressUrl);

                    try {
                        var web3js = new Web3(provider);
                    } catch (e) {
                        var web3js = new Web3(provider);
                    }
                }
                this.setWeb3(web3js, addressUrl);
                resolve(web3js);
            }
        })
    }
    /**
     * initialize web3 and a smart contract
     * @param {*} compiledJson 
     * @param {*} contractName 
     * @param {*} networkId 
     */
    initWithContractJson(compiledJson,addressUrl, contractName, networkId) {
        return new Promise((resolve, reject) => {
            this.init(addressUrl)
                .then(() => resolve(this.initContractJson(compiledJson, contractName, networkId)))
                .catch(error => reject(error));
        });
    }
    initContractJson(compiledJson, contractName, networkId) {
        var networkId = networkId || null;

        if (!networkId) {
            return this.getNetworkId()
                .then(networkId => {
                    return this.performInitContractJson(compiledJson, contractName, networkId);
                })
        }
    }
    performInitContractJson(compiledJson, contractName, networkId) {
        if (typeof compiledJson['abi'] == undefined) {
            console.error('BcExplorer error: missing ABI in the compiled Truffle JSON');
            return false;
        }
        var abiArray = compiledJson['abi'];
        if ((typeof compiledJson['networks'] == undefined) || (compiledJson['networks'][networkId] == undefined)) {
            console.error('BcExplorer error: missing networkId in the compiled Truffle JSON.');

            return false;
        }
        var contractAddr = compiledJson['networks'][networkId].address;

        if (!this.web3().isAddress(contractAddr)) return false;

        this.initContract(abiArray, contractAddr, contractName);
    }
    initContract(abiArray, contractAddr, contractName) {
        var contractName = this.contractDefaultName(contractName);

        this.contractInst[contractName] = this.web3().eth.contract(abiArray).at(contractAddr);
    }
    contractDefaultName(name) {
        var contractName = name || 'default';

        if (!contractName || !contractName.length) contractName = 'default';

        return contractName;
    }

    setWeb3(web3js, addressUrl) {
        this.info.addressUrl = addressUrl;
        this.info.isConnected = web3js.isConnected();
        this.web3inst = web3js;

        this.loadInfo();
    }

    async loadInfo() {
        try {
            var coinbase = await this.getCoinbase();
            var networkId = await this.getNetworkId();
            var mainAccount = await this.getMainAccount();
            var balance = await this.getBalance(mainAccount);
            return Promise.resolve(this.info);
        } catch (e) {
            return Promise.reject(e);
        }
    }
    /**
     * return info set local class varibale info
     */
    getInfo(attr) {
        if (attr) return this.info[attr];
        return this.info;

    }
    /**
     * Check if the connection with the blockchain is established and if the contract
     * is properly initialized.
     *
     * @return {bool}
     */
    isConnected() {
        return this.info.isConnected && this.countContract();
    }

    contract(contractName) {
        if (this.countContract() == 0) {
            console.error('BcExplorer error: contract is not initialized.');

            return;
        }

        var contractName = this.contractDefaultName(contractName);

        if (typeof this.contractInst[contractName] == 'undefined') {
            console.error('BcExplorer error: contract does not exist.');

            return;
        }
        return this.contractInst[contractName];
    }
    /**
     * return the network id of connected blockchain network
     */
    getNetworkId() {
        return new Promise((resolve, reject) => {
            this.web3().version.getNetwork((error, networkId) => {
                if (error) {
                    console.error(error);

                    reject(new Error('BcExplorer Error: networkId not available'));

                } else {
                    this.info.networkId = networkId;
                    resolve(networkId);
                }
            });
        });
    }
    /**
     * return the selected wallet address
     */
    getMainAccount() {
        return new Promise((resolve, reject) => {
            this.web3().eth.getAccounts((error, accounts) => {
                if (error) {
                    reject(new Error('BcExplorer Error: acounts not available'));

                } else {
                    this.info.mainAccount = accounts[0];
                    resolve(accounts[0]);
                }
            });
        });
    }
    /**
     * return address of current user
     */
    getCoinbase() {
        return new Promise((resolve, reject) => {
            if (this.info.coinbase) resolve(this.info.coinbase);


            this.web3().eth.getCoinbase((error, coinbase) => {
                if (error) {
                    reject(new Error('BcExplorerError: coinbase not available'));

                } else {
                    this.info.coinbase = coinbase;
                    resolve(coinbase);
                }
            });
        });
    }
    /**
     * return balance of account
     * @param {*} accountAddr 
     */
    getBalance(accountAddr) {
        return new Promise((resolve, reject) => {
            this.web3().eth.getBalance(accountAddr, (error, balance) => {
                if (error) {
                    reject(new Error('BcExplorer error: impossible to get balance of account:' + accountAddr));
                } else {
                    if (balance && (typeof balance == 'object')) {
                        var bal = balance.toNumber();
                        this.info.balance = bal;
                        resolve(bal);
                    }
                    resolve(balance);

                }
            });
        });
    }

    countContract() {
        var total = 0;
        for (var key in this.contractInst) {
            if (this.contractInst.hasOwnProperty(key)) total++;

        }
        return total;
    }

    /**
 * Tranform the balance from Wei to Ether
 *
 * @param {mixed} bal
 * @return {numeric}
 */
    weiToEther(bal) {
        if (typeof bal == 'object') {
            bal = bal.toNumber();
        }

        return this.web3().fromWei(bal, "ether");
    }



    /**
     * Transform the parameter from bytes to string.
     *
     * @param {string} bytes
     * @return {string}
     */
    toAscii(bytes) {
        return this.web3().toAscii(bytes).replace(/\u0000/g, '');
    }



    /**
     * Transform a timestamp number to date.
     *
     * @param {numeric} bytes
     * @return {string}
     */
    toDate(timestamp) {
        return new Date(timestamp * 1000).toISOString();
    }
}
export default BcExplorer;