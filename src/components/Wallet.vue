<template>
<div class="wallet">
    <v-flex xs12 sm6 offset-sm3>
    <v-card>
      <v-container fluid>
        <v-card flat>
          <v-card-actions>
            <v-card-title><b>残高</b></v-card-title>
            <v-spacer />
            <v-btn fab small flat @click="getAccount()" :loading="isLoading"><v-icon>cached</v-icon></v-btn>
          </v-card-actions>
          <v-card-text>{{ wallet.balance }} xem</v-card-text>
          <div v-for="mosaic in wallet.mosaics">
            <v-card-text>
              {{mosaic.mosaicId.namespaceId}}:{{mosaic.mosaicId.name}}
              {{ mosaic.amount / Math.pow(10, mosaic.properties.divisibility)}}
            </v-card-text>
          </div>
          <v-card-title><b>送金先アドレス</b></v-card-title>
          <v-card-text>{{ wallet.address }}</v-card-text>
          <v-card flat><qriously v-model="qrJson" :size="qrSize" ></qriously></v-card>
        </v-card>
        <v-card flat>
          <div v-for="(item, index) in validation" :key="index" class="errorLabel">
            <div v-if="item!==true">{{ item }}</div>
          </div>
          <v-card-title><b>送金</b></v-card-title>
            <v-text-field
              label="送金先"
              v-model="toAddr"
              :counter="40"
              required
              placeholder="例. NBHWRG6STRXL2FGLEEB2UOUCBAQ27OSGDTO44UFC"
            ></v-text-field>
          <v-text-field
            label="メッセージ"
            v-model="message"
            placeholder="例. ありがとう"
          ></v-text-field>
          <v-text-field
              label="NEM"
              v-model="toAmount"
              type="number"
              required
            ></v-text-field>

            <div v-for="(mosaic, index ) in wallet.mosaics">
              <v-text-field
              :label="mosaic.mosaicId.namespaceId + ':' + mosaic.mosaicId.name"
              v-model="sendMosaicAmount[index]"
              type="number"
            ></v-text-field>
            </div>-
          <v-flex>
            <v-btn color="blue" class="white--text" @click="tapSend()">送金</v-btn>
          </v-flex>
        </v-card>
      </v-container>
    </v-card>
    </v-flex>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import nemWrapper from '../ts/nemWrapper'
import walletModel from '../ts/walletModel'
import { Mosaic } from 'nem-library';

@Component({
  name: 'wallet',
  data: () => ({
    nem: new nemWrapper(),
    qrJson: '',
    rules: {
      senderAddrLimit: (value:string) => (value && (value.length === 46 || value.length === 40)) || '送金先アドレス(-除く)は40文字です。',
      senderAddrInput: (value:string) => {
        const pattern = /^[nNtTmM][a-zA-Z0-9-]+$/
        return pattern.test(value) || '送金先の入力が不正です'
      },/*
      amountLimit: (value:number) => (value >= 0) || '数量を入力してください',
      amountInput: (value:string) => {
        const pattern = /^[0-9.]+$/
        return (pattern.test(value) && !isNaN(Number(value))) || '数量の入力が不正です'
      },*/
      messageRules: (value:string) => {
        const length = encodeURIComponent(value).replace(/%../g,"x").length
        return length <= 1024 || 'メッセージの最大文字数が超えています。'}
    }
  }),
  watch: {
    'wallet.address' (newVal, oldVal) {
      this.$data.qrJson = this.$data.nem.getQRcodeJson('2', 2, '', newVal, 0, '')
    }
  }
})

export default class Wallet extends Vue {
  isLoading:boolean = false
  wallet:walletModel = new walletModel()
  qrSize:number = 200
  toAmount:number = 0
  toAddr:string = ''
  message:string = ''
  sendMosaicAmount:Array<number> = []
  sendMosaic:Array<any> = []
  validation:Array<any> = []
  mounted () {
  }
  async getAccount () {
    this.isLoading = true
    await this.wallet.getAccount()
    this.isLoading = false
  }
  async tapSend() {
    this.sendMosaic = []
    console.log('tapSend')
    if (this.isValidation() === true) {
      this.sendMosaicAmount.forEach((amount, i) => {
        if (amount != undefined && amount > 0) {
          const mosaic = this.wallet.mosaics[i]
          this.sendMosaic.push({
            mosaicId: mosaic.mosaicId,
            quantity: Number(amount)
          })
        }
      })

      let result
      if (this.sendMosaic.length > 0) {
        result = await this.wallet.sendMosaic(this.toAddr, this.sendMosaic, this.message)
      } else {
        result = await this.wallet.sendNem(this.toAddr, this.toAmount, this.message)
      }

      console.log('tapSend', result)
      let message = '送金しました'
      if (result.code !== 1) {
        message = "Error " + result.message
      }

      Vue.prototype.$toast(message)
    }
  }
  isValidation(): Boolean {
    this.validation = []
    this.validation.push(this.$data.rules.senderAddrLimit(this.toAddr))
    this.validation.push(this.$data.rules.senderAddrInput(this.toAddr))
    //this.validation.push(this.$data.rules.amountLimit(this.toAmount))
    //this.validation.push(this.$data.rules.amountInput(this.toAmount))
    this.validation.push(this.$data.rules.messageRules(this.message))
    console.log(this.validation)
    let isError:Boolean = false
    this.validation.forEach((obj:any) => {
      if (obj !== true) { isError = true }
    })
    return !isError
  }
}
</script>
<style scoped>
.wallet {
  word-break: break-all;
}
.errorLabel {
  color: red;
}
</style>
