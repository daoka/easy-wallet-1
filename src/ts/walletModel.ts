import localForage from 'localforage'
import nemWrapper from './nemWrapper'
import { MosaicTransferable, Account } from '../../node_modules/nem-library';

export default class walletModel {
    balance: number = 0
    address: string = ''
    publicKey: string = ''
    privateKey: string = ''
    mosaics: Array<MosaicTransferable> = []

    nem = new nemWrapper()

    constructor() {
        // クラス生成時にローカルストレージからアカウント情報を取得
        this.load()
        .then((result) => {
            console.log(result)
            // 無ければアカウントを作成します
            if (result === null) {
                this.nem.createAccount()
                .then((wallet) => {
                    const account = Account.createWithPrivateKey(wallet.privateKey)
                    this.address = wallet.address.plain()
                    this.privateKey = wallet.privateKey
                    this.publicKey = account.publicKey
                    this.save()
                }).catch((error) => {
                    console.error(error)
                })
            } else {
            // あればNEMの残高を取得します
                this.getAccount()
            }
        }).catch((error) => {
            console.error(error)
        })
    }

    // ローカルストレージへ保存.
    async save() {
        let key = 'easy-wallet'
        let result:any = await localForage.setItem(key, this.toJSON())
        return result
    }

    // ローカルストレージから取得.
    async load() {
        let key = 'easy-wallet'
        let result:any = await localForage.getItem(key)
        if (result !== null) {
            this.address = result.address
            this.privateKey = result.privateKey
            this.publicKey = result.publicKey
        }
        return result
    }

    // ローカルストレージから削除.
    async remove() {
        let key = 'easy-wallet'
        let result:any = await localForage.removeItem(key)
        return result
    }

    // アカウント情報を取得.
    async getAccount() {
        let result = await this.nem.getAccount(this.publicKey)
        this.balance = result.balance.balance / this.nem.getNemDivisibility()
        this.mosaics = await this.nem.getMosaics(this.address)
    }

    // 送金(NEM)
    async sendNem(address:string, amount:number, message:string)  {
        let result = await this.nem.sendNem(address, this.privateKey, amount, message)
        return result
    }

    // 送金(モザイク)
    async sendMosaic(address:string, mosaics:Array<any>, message:string) {
      let result = await this.nem.sendMosaics(address, this.privateKey, mosaics, message)
      return result
    }

    toJSON() {
        return {
            address: this.address,
            privateKey: this.privateKey,
            publicKey: this.publicKey
        }
    }
}
