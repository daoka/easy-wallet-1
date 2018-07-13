import nem from 'nem-sdk'
import encoding from 'encoding-japanese'
import { NEMLibrary, NetworkTypes, AccountHttp, Address, AccountInfoWithMetaData, Account, TransferTransaction, TimeWindow, XEM, PlainMessage, TransactionHttp, MosaicHttp, MosaicId, ServerConfig, Password, SimpleWallet } from 'nem-library'
import { Observable} from 'rxjs/Rx'

export default class nemWrapper {

    constructor () {
        NEMLibrary.reset()
        NEMLibrary.bootstrap(NetworkTypes.MAIN_NET)
    }

    // アカウント作成.
    async createAccount() {
       const walletName = "wallet"
       const password = new Password("aaaaaaaa")
       const simpleWallet = SimpleWallet.create(walletName, password)
       const account = simpleWallet.open(password)
       const result = {
         address: account.address,
         privateKey: account.privateKey
       }

       return result
    }

    // アカウント情報取得.
    async getAccount(address: string) {
        const addressObj = new Address(address)
        const accountHttp = new AccountHttp(this.nisList())
        const result = await accountHttp.getFromAddress(addressObj).toPromise()
        return result
    }

    // 送金（NEM）
    async sendNem(address:string, privateKey:string, amount:number, message:string) {
       const transactionHttp = new TransactionHttp(this.nisList())
       const account = Account.createWithPrivateKey(privateKey)
       const transferTransaction = TransferTransaction.create(
         TimeWindow.createWithDeadline(),
         new Address(address),
         new XEM(amount),
         PlainMessage.create(message)
       )
       const signedTransaction = account.signTransaction(transferTransaction)
       const result = await transactionHttp.announceTransaction(signedTransaction).toPromise()
       return result
    }

    // 送金（Mosaic）
    async sendMosaics(address:string, privateKey:string, mosaics:Array<any>, message:string) {
       const transactionHttp = new TransactionHttp(this.nisList())
       const mosaicHttp = new MosaicHttp(this.nisList())
       const account = Account.createWithPrivateKey(privateKey)

       const result = Observable.from(mosaics)
       .flatMap(_ => mosaicHttp.getMosaicTransferableWithAmount(_.mosaicId, _.quantity))
       .toArray()
       .map(mosaics => TransferTransaction.createWithMosaics(
         TimeWindow.createWithDeadline(),
         new Address(address),
         mosaics,
         PlainMessage.create(message)
       ))
       .map(transaction => account.signTransaction(transaction))
       .flatMap(signedTransaction => transactionHttp.announceTransaction(signedTransaction))
       .toPromise()

       return result
    }

    // モザイク取得
    async getMosaics(address: string) {
        const accountHttp = new AccountHttp(this.nisList())
        const mosaicHttp = new MosaicHttp(this.nisList())
        const result = await accountHttp.getMosaicOwnedByAddress(new Address(address))
        .flatMap(_ => _)
        .filter(mosaic => mosaic.mosaicId.namespaceId !== 'nem')
        .flatMap(mosaic => mosaicHttp.getMosaicDefinition(mosaic.mosaicId))
        .toPromise()

        return result
    }

    // QRコードjson取得.
    getQRcodeJson(v:string, type:number, name:string, addr:string, amount:number, msg:string) {
        // v:2, type:1 アカウント, type:2 請求書
        let amountVal = amount * Math.pow(10, 6)
        let json = {
          type: type,
          data: {
            name: name,
            addr: addr,
            amount: amountVal,
            msg: msg
          },
          v: v
        }
        let jsonString = JSON.stringify(json)
        let result = encoding.codeToString(encoding.convert(this.getStr2Array(jsonString), 'UTF8'))
        return result
    }

    // NEMの可分性取得
    getNemDivisibility(): number {
        return Math.pow(10, XEM.DIVISIBILITY)
    }

    private getStr2Array(str:string) {
        let array = []
        for (let i = 0; i < str.length; i++) {
          array.push(str.charCodeAt(i))
        }
        return array
    }

    private nisList():ServerConfig[] {
      return [
        {protocol: "https", domain: "aqualife1.supernode.me", port: 7891 },
        {protocol: "https", domain: "aqualife2.supernode.me", port: 7891 },
        {protocol: "https", domain: "aqualife3.supernode.me", port: 7891 },
        {protocol: "https", domain: "beny.supernode.me", port: 7891 },
        {protocol: "https", domain: "shibuya.supernode.me", port: 7891 },
        ]
    }
}
